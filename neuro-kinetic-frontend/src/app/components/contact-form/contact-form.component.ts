import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { ContactMessageRequest } from '../../models/api.models';

export type ContactFormMode = 'contact' | 'landing';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss']
})
export class ContactFormComponent {
  @Input() mode: ContactFormMode = 'contact';
  @Output() sent = new EventEmitter<void>();

  submitting = false;

  // Shared fields
  firstName = '';
  lastName = '';
  email = '';
  organization = '';
  message = '';

  // Contact mode
  subject = 'General Inquiry';
  readonly subjectOptions = [
    'General Inquiry',
    'Sales Information',
    'Technical Support',
    'Partnership Opportunity',
    'Clinical Integration'
  ];

  // Landing mode (professional fields)
  role = '';
  interest = '';
  readonly roleOptions = [
    { label: 'Select your role', value: '' },
    { label: 'Healthcare Provider', value: 'Healthcare Provider' },
    { label: 'Researcher', value: 'Researcher' },
    { label: 'Clinical Administrator', value: 'Clinical Administrator' },
    { label: 'IT Professional', value: 'IT Professional' },
    { label: 'Other', value: 'Other' }
  ];

  readonly interestOptions = [
    { label: 'Select your interest', value: '' },
    { label: 'Voice Analysis Technology', value: 'Voice Analysis Technology' },
    { label: 'Gait Analysis Technology', value: 'Gait Analysis Technology' },
    { label: 'Clinical Integration', value: 'Clinical Integration' },
    { label: 'Implementation Support', value: 'Implementation Support' },
    { label: 'General Information', value: 'General Information' }
  ];

  private isValidEmail(email: string): boolean {
    const value = (email ?? '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  get canSubmit(): boolean {
    if (this.submitting) return false;

    const baseOk =
      this.firstName.trim().length > 0 &&
      this.lastName.trim().length > 0 &&
      this.isValidEmail(this.email) &&
      this.message.trim().length > 0 &&
      this.message.trim().length <= 4000;

    if (!baseOk) return false;

    if (this.mode === 'contact') {
      return this.subject.trim().length > 0;
    }

    // landing mode requires role + interest selection
    return this.role.trim().length > 0 && this.interest.trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Missing information',
        detail: 'Please complete all required fields correctly before sending.'
      });
      return;
    }

    this.submitting = true;

    const payload: ContactMessageRequest = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      organization: this.organization?.trim() ? this.organization.trim() : null,
      subject:
        this.mode === 'contact'
          ? this.subject.trim()
          : this.interest.trim() || 'General Inquiry',
      message: this.buildMessage()
    };

    this.api.sendContactMessage(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.sent.emit();

        if (res?.emailSent === false) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Saved with warning',
            detail: res?.message ?? 'Message saved, but email notification failed.'
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Sent',
            detail: res?.message ?? 'Message sent successfully.'
          });
        }

        this.reset();
      },
      error: (err) => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Send failed',
          detail: err?.error?.message ?? err?.message ?? 'Could not send message right now.'
        });
      }
    });
  }

  private buildMessage(): string {
    const userMessage = this.message.trim();

    if (this.mode === 'contact') return userMessage;

    // Landing mode: enrich message with selected dropdown context.
    return [
      userMessage,
      '',
      `Role: ${this.role.trim()}`,
      `Area of Interest: ${this.interest.trim()}`
    ].join('\n');
  }

  private reset(): void {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.organization = '';
    this.message = '';
    this.subject = 'General Inquiry';
    this.role = '';
    this.interest = '';
  }

  constructor(private api: ApiService, private messageService: MessageService) {}
}

