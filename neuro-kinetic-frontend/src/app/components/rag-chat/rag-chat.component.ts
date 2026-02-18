import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  RagTestResponse,
  RagRelevantResponse,
  isRagIrrelevant
} from '../../models/api.models';

/**
 * Standalone RAG (Clinical Decision Support) chat component.
 * Use inside a dialog or inline; pass riskPercent and mode from screening result.
 */
@Component({
  selector: 'app-rag-chat',
  templateUrl: './rag-chat.component.html',
  styleUrls: ['./rag-chat.component.scss']
})
export class RagChatComponent {
  @Input() riskPercent: number | null = null;
  @Input() mode: 'voice' | 'gait' | 'multimodal' = 'voice';

  question = '';
  loading = false;
  error = '';
  response: RagTestResponse | null = null;

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ask(): void {
    const q = (this.question || '').trim();
    if (!q) {
      this.error = 'Please enter a question.';
      return;
    }
    if (this.riskPercent == null || this.riskPercent === undefined) {
      this.error = 'No screening result available.';
      return;
    }
    this.error = '';
    this.response = null;
    this.loading = true;
    this.apiService.ragTest({
      question: q,
      riskPercent: Number(this.riskPercent),
      mode: this.mode
    }).subscribe({
      next: (res) => {
        this.response = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 400) {
          this.error = err?.error?.message || 'Please enter a valid question.';
        } else if (err?.status === 500) {
          this.error = 'Service temporarily unavailable. Please try again later.';
        } else {
          this.error = err?.error?.message || 'Something went wrong. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  isIrrelevant(res: RagTestResponse | null): boolean {
    return res !== null && isRagIrrelevant(res);
  }

  getRelevanceMessage(res: RagTestResponse | null): string {
    return res && isRagIrrelevant(res) ? res.relevance_message : '';
  }

  getClinical(res: RagTestResponse | null): RagRelevantResponse | null {
    if (!res || isRagIrrelevant(res)) return null;
    return res as RagRelevantResponse;
  }

  clearResponse(): void {
    this.response = null;
  }

  /** Reset state (e.g. when dialog opens). */
  reset(): void {
    this.error = '';
    this.response = null;
    this.question = '';
  }
}
