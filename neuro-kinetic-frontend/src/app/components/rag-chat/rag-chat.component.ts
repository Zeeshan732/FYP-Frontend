import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  RagTestResponse,
  RagRelevantResponse,
  isRagIrrelevant
} from '../../models/api.models';

const DEFAULT_RAG_CHAT_STORAGE_KEY = 'neurosync_rag_chat_messages';

export interface ChatMessage {
  type: 'text';
  text: string;
  reply: boolean;
  sender: string;
  date: Date;
}

/** Serializable shape for localStorage */
interface StoredChatMessage {
  type: 'text';
  text: string;
  reply: boolean;
  sender: string;
  date: string;
}

/**
 * Simple RAG (Clinical Decision Support) chat. Pass riskPercent and mode from screening result.
 * Chat history is persisted in localStorage and restored on load; "New chat" clears and starts fresh.
 */
@Component({
  selector: 'app-rag-chat',
  templateUrl: './rag-chat.component.html',
  styleUrls: ['./rag-chat.component.scss']
})
export class RagChatComponent implements OnInit, OnChanges {
  @Input() riskPercent: number | null = null;
  @Input() mode: 'voice' | 'gait' | 'multimodal' = 'voice';
  /** When 'light', uses centered empty state and compact input matching the rest of the app. */
  @Input() theme: 'default' | 'light' = 'default';
  /** Storage key for persisted chat thread (supports multi-thread history). */
  @Input() chatStorageKey: string = DEFAULT_RAG_CHAT_STORAGE_KEY;
  /** Hide internal "New chat" button when parent provides its own history controls. */
  @Input() showNewChatButton = true;
  @Input() conversationId: number | null = null;
  @Input() useLocalDraftFallback = true;
  @Output() messageSent = new EventEmitter<string>();
  @Output() chatCleared = new EventEmitter<void>();
  @Output() conversationCreated = new EventEmitter<number>();
  @Output() conversationUnavailable = new EventEmitter<void>();

  messages: ChatMessage[] = [];
  loading = false;
  error = '';
  inputMessage = '';
  private pendingConversationCreate: Promise<number | null> | null = null;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.conversationId) {
      this.loadChatFromServer();
      return;
    }
    if (!this.useLocalDraftFallback) {
      this.messages = [];
      this.error = '';
      return;
    }
    this.loadChatFromStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId'] && !changes['conversationId'].firstChange) {
      if (this.conversationId) {
        // When a new conversation is created from first send, keep optimistic messages.
        // Reload only if there is no in-memory chat to avoid wiping the first message.
        if (this.messages.length === 0) {
          this.loadChatFromServer();
        }
      } else {
        this.messages = [];
        this.error = '';
        this.loading = false;
        this.inputMessage = '';
        this.cdr.detectChanges();
      }
      return;
    }
    if (changes['chatStorageKey'] && !changes['chatStorageKey'].firstChange) {
      if (!this.useLocalDraftFallback) {
        this.messages = [];
        this.error = '';
        this.loading = false;
        this.inputMessage = '';
        this.cdr.detectChanges();
        return;
      }
      this.loadChatFromStorage();
    }
  }

  private loadChatFromServer(): void {
    if (!this.conversationId) return;
    this.messages = [];
    this.error = '';
    this.apiService.getChatMessages(this.conversationId).subscribe({
      next: (items) => {
        this.messages = items.map((m) => ({
          type: 'text',
          text: m.content,
          reply: m.role === 'user',
          sender: m.role === 'user' ? 'You' : 'NeuroSync',
          date: new Date(m.createdAt)
        }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.messages = [];
        this.error = 'Unable to load this chat. Please try again.';
        this.conversationId = null;
        this.conversationUnavailable.emit();
        this.cdr.detectChanges();
      }
    });
  }

  private loadChatFromStorage(): void {
    this.messages = [];
    this.error = '';
    try {
      const raw = localStorage.getItem(this.chatStorageKey || DEFAULT_RAG_CHAT_STORAGE_KEY);
      if (!raw) return;
      const stored: StoredChatMessage[] = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        this.messages = stored.map(m => ({
          type: 'text' as const,
          text: m.text,
          reply: m.reply,
          sender: m.sender,
          date: new Date(m.date)
        }));
        this.cdr.detectChanges();
      }
    } catch {
      // Invalid or old format; ignore
    }
  }

  private saveChatToStorage(): void {
    if (this.conversationId) return;
    try {
      const toStore: StoredChatMessage[] = this.messages.map(m => ({
        type: 'text',
        text: m.text,
        reply: m.reply,
        sender: m.sender,
        date: m.date instanceof Date ? m.date.toISOString() : new Date().toISOString()
      }));
      localStorage.setItem(this.chatStorageKey || DEFAULT_RAG_CHAT_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Quota or other; ignore
    }
  }

  sendMessage(): void {
    const q = this.inputMessage.trim();
    if (!q) return;
    this.inputMessage = '';
    const riskValue = this.riskPercent != null && !isNaN(Number(this.riskPercent)) ? Number(this.riskPercent) : 0;
    this.error = '';
    this.loading = true;

    this.messages = [
      ...this.messages,
      { type: 'text', text: q, reply: true, sender: 'You', date: new Date() }
    ];
    this.messageSent.emit(q);
    this.ensureConversationAndPersistUser(q);
    this.saveChatToStorage();
    this.cdr.detectChanges();

    const setReply = (text: string) => {
      this.loading = false;
      this.messages = [
        ...this.messages,
        { type: 'text', text, reply: false, sender: 'NeuroSync', date: new Date() }
      ];
      this.saveChatToStorage();
      this.persistAssistantMessage(text);
      this.cdr.detectChanges();
    };
    const setError = (err: any) => {
      this.loading = false;
      const body = err?.error;
      const backendMessage = typeof body === 'string' ? body : body?.message;
      const errMsg = err?.status === 400
        ? (backendMessage || 'Please enter a valid question.')
        : err?.status === 502
          ? (backendMessage || 'The knowledge-base service is not responding. Please check backend RAG configuration and try again.')
          : err?.status === 503 || err?.status === 500
            ? (backendMessage || 'Service temporarily unavailable. Please try again later.')
            : (backendMessage || 'Something went wrong. Please try again.');
      this.messages = [
        ...this.messages,
        { type: 'text', text: errMsg, reply: false, sender: 'NeuroSync', date: new Date() }
      ];
      this.saveChatToStorage();
      this.persistAssistantMessage(errMsg);
      this.cdr.detectChanges();
    };

    // No screening result: use backend Parkinson knowledge-base Q&A (/api/rag/ask).
    if (this.riskPercent == null) {
      this.apiService.ragAsk(q).subscribe({
        next: (res) => setReply(res.answer || 'No answer returned.'),
        error: setError
      });
      return;
    }

    // Has risk from screening: use hybrid RAG (OpenAI/Ollama) for clinical guidance.
    this.apiService.ragTest({
      question: q,
      riskPercent: riskValue,
      mode: this.mode
    }).subscribe({
      next: (res) => setReply(this.formatResponseAsText(res)),
      error: setError
    });
  }

  private ensureConversationAndPersistUser(content: string): void {
    // Existing conversation: persist immediately.
    if (this.conversationId) {
      this.apiService.appendChatMessage(this.conversationId, 'user', content).subscribe({
        error: () => {
          this.conversationId = null;
          this.conversationUnavailable.emit();
        }
      });
      return;
    }

    // New conversation already being created: queue this user message on completion.
    if (this.pendingConversationCreate) {
      this.pendingConversationCreate.then((id) => {
        if (!id) return;
        this.apiService.appendChatMessage(id, 'user', content).subscribe({ error: () => void 0 });
      });
      return;
    }

    // Start conversation creation and persist first user message once ID exists.
    this.pendingConversationCreate = new Promise<number | null>((resolve) => {
      this.apiService.createChatConversation().subscribe({
        next: (conversation) => {
          this.conversationId = conversation.id;
          this.conversationCreated.emit(conversation.id);
          this.apiService.appendChatMessage(conversation.id, 'user', content).subscribe({ error: () => void 0 });
          resolve(conversation.id);
        },
        error: () => {
          resolve(null);
        }
      });
    }).finally(() => {
      this.pendingConversationCreate = null;
    });
  }

  private persistAssistantMessage(content: string): void {
    // Existing conversation: persist immediately.
    if (this.conversationId) {
      this.apiService.appendChatMessage(this.conversationId, 'assistant', content).subscribe({ error: () => void 0 });
      return;
    }

    // Conversation still being created: persist once ID is available.
    if (this.pendingConversationCreate) {
      this.pendingConversationCreate.then((id) => {
        if (!id) return;
        this.apiService.appendChatMessage(id, 'assistant', content).subscribe({ error: () => void 0 });
      });
    }
  }

  private formatResponseAsText(res: RagTestResponse): string {
    if (isRagIrrelevant(res)) {
      return res.relevance_message || 'Your question seems outside the scope of this screening. Try asking about your risk level or next steps.';
    }
    const c = res as RagRelevantResponse;
    const parts: string[] = [];
    parts.push(`Risk summary: ${c.risk_summary.risk_level} (${c.risk_summary.risk_percent}%). ${c.risk_summary.summary_text}`);
    parts.push(`Priority: ${c.recommendation.priority}`);
    parts.push('');
    parts.push(`Clinical analysis: ${c.clinical_analysis.interpretation}`);
    if (c.clinical_analysis.key_findings?.length) {
      parts.push('Key findings: ' + c.clinical_analysis.key_findings.join('; '));
    }
    parts.push('');
    parts.push('Recommendation:');
    if (c.recommendation.next_steps?.length) {
      c.recommendation.next_steps.forEach(s => parts.push('• ' + s));
    }
    if (c.recommendation.follow_up) parts.push(c.recommendation.follow_up);
    parts.push('');
    parts.push(`Doctor referral: ${c.doctor_referral.recommended_specialist} — ${c.doctor_referral.reason}`);
    parts.push(`Timing: ${c.doctor_referral.suggested_timing}`);
    if (c.doctor_referral.city) parts.push(`City: ${c.doctor_referral.city}`);
    parts.push('');
    parts.push('Lifestyle guidance:');
    if (c.lifestyle_guidance.general_advice?.length) {
      c.lifestyle_guidance.general_advice.forEach(a => parts.push('• ' + a));
    }
    if (c.lifestyle_guidance.activity_suggestions?.length) {
      c.lifestyle_guidance.activity_suggestions.forEach(a => parts.push('• ' + a));
    }
    if (c.lifestyle_guidance.notes) parts.push(c.lifestyle_guidance.notes);
    parts.push('');
    parts.push(c.disclaimer);
    return parts.join('\n');
  }

  /** Start a new chat: clear messages and persisted history. */
  newChat(): void {
    if (this.conversationId) {
      // Optimistically clear UI; parent will reset cid and route state.
      this.messages = [];
      this.error = '';
      this.loading = false;
      this.inputMessage = '';
      this.chatCleared.emit();
      this.cdr.detectChanges();
      return;
    }
    this.messages = [];
    this.error = '';
    try {
      localStorage.removeItem(this.chatStorageKey || DEFAULT_RAG_CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.chatCleared.emit();
    this.cdr.detectChanges();
  }

  /** @deprecated Use newChat(). Kept for compatibility. */
  clearChat(): void {
    this.newChat();
  }

  reset(): void {
    this.error = '';
    this.messages = [];
  }

}
