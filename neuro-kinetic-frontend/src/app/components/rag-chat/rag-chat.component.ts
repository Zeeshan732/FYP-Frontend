import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  RagTestResponse,
  RagRelevantResponse,
  isRagIrrelevant
} from '../../models/api.models';

export interface ChatMessage {
  type: 'text';
  text: string;
  reply: boolean;
  sender: string;
  date: Date;
}

/**
 * Simple RAG (Clinical Decision Support) chat. Pass riskPercent and mode from screening result.
 */
@Component({
  selector: 'app-rag-chat',
  templateUrl: './rag-chat.component.html',
  styleUrls: ['./rag-chat.component.scss']
})
export class RagChatComponent {
  @Input() riskPercent: number | null = null;
  @Input() mode: 'voice' | 'gait' | 'multimodal' = 'voice';
  /** When 'light', uses centered empty state and compact input matching the rest of the app. */
  @Input() theme: 'default' | 'light' = 'default';

  messages: ChatMessage[] = [];
  loading = false;
  error = '';
  inputMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

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
    this.messages = [
      ...this.messages,
      { type: 'text', text: 'Getting guidance…', reply: false, sender: 'NeuroSync', date: new Date() }
    ];
    this.cdr.detectChanges();

    this.apiService.ragTest({
      question: q,
      riskPercent: riskValue,
      mode: this.mode
    }).subscribe({
      next: (res) => {
        this.loading = false;
        const text = this.formatResponseAsText(res);
        this.messages = this.messages.slice(0, -1);
        this.messages = [
          ...this.messages,
          { type: 'text', text, reply: false, sender: 'NeuroSync', date: new Date() }
        ];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        const errMsg = err?.status === 400
          ? (err?.error?.message || 'Please enter a valid question.')
          : err?.status === 500
            ? 'Service temporarily unavailable. Please try again later.'
            : (err?.error?.message || 'Something went wrong. Please try again.');
        this.messages = this.messages.slice(0, -1);
        this.messages = [
          ...this.messages,
          { type: 'text', text: errMsg, reply: false, sender: 'NeuroSync', date: new Date() }
        ];
        this.cdr.detectChanges();
      }
    });
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

  clearChat(): void {
    this.messages = [];
    this.error = '';
    this.cdr.detectChanges();
  }

  reset(): void {
    this.error = '';
    this.messages = [];
  }

}