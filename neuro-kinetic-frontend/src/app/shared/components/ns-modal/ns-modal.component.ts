import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { NsModalIntent } from './ns-modal.models';

@Component({
  selector: 'ns-modal',
  templateUrl: './ns-modal.component.html',
  styleUrls: ['./ns-modal.component.scss'],
  animations: [
    trigger('nsBackdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('180ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('nsPanel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.96)' }),
        animate(
          '180ms ease-out',
          style({ opacity: 1, transform: 'scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms ease-in',
          style({ opacity: 0, transform: 'scale(0.96)' })
        ),
      ]),
    ]),
  ],
})
export class NsModalComponent {
  @Input() visible = false;
  /** Visual intent: header tint, icon, primary action color */
  @Input() intent: NsModalIntent = 'info';
  @Input() title = '';
  /** Muted secondary line under the projected body */
  @Input() subtext: string | null = null;
  @Input() confirmLoading = false;
  /** Backdrop and Escape respect this (footer cancel always dismisses when not loading). */
  @Input() dismissible = true;
  /** Single primary action (e.g. success / OK); hides cancel */
  @Input() singleAction = false;
  /** Accessible labels for icon-only footer controls */
  @Input() cancelLabel = 'Cancel';
  @Input() confirmLabel = 'Confirm';
  /** Wider panel for read-only content (e.g. conversation transcript). */
  @Input() panelSize: 'default' | 'wide' = 'default';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.visible || !this.dismissible || this.confirmLoading) {
      return;
    }
    event.preventDefault();
    this.emitDismiss();
  }

  onBackdropClick(): void {
    if (!this.dismissible || this.confirmLoading) {
      return;
    }
    this.emitDismiss();
  }

  onCancelClick(): void {
    if (this.confirmLoading) {
      return;
    }
    this.emitDismiss();
  }

  onConfirmClick(): void {
    if (this.confirmLoading) {
      return;
    }
    this.confirm.emit();
  }

  headerModifierClass(): string {
    return `ns-modal__header--${this.intent}`;
  }

  confirmModifierClass(): string {
    return `ns-modal__footer-confirm--${this.intent}`;
  }

  private emitDismiss(): void {
    this.visibleChange.emit(false);
    this.cancel.emit();
  }
}
