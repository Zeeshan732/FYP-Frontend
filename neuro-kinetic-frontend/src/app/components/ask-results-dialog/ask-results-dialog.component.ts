import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { RagChatComponent } from '../rag-chat/rag-chat.component';

@Component({
  selector: 'app-ask-results-dialog',
  templateUrl: './ask-results-dialog.component.html',
  styleUrls: ['./ask-results-dialog.component.scss']
})
export class AskResultsDialogComponent {
  @Input() visible = false;
  @Input() riskPercent: number | null = null;
  @Input() mode: 'voice' | 'gait' | 'multimodal' = 'voice';

  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('ragChat') ragChat?: RagChatComponent;

  constructor() {}

  onHide(): void {
    this.visibleChange.emit(false);
  }

  onOpen(): void {
    this.ragChat?.reset();
  }
}
