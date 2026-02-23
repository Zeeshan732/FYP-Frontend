import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  onHide(): void {
    this.visibleChange.emit(false);
  }

  goToConsultation(): void {
    this.visibleChange.emit(false);
    const queryParams: { riskPercent?: number; mode: string } = { mode: this.mode };
    if (this.riskPercent != null && !isNaN(this.riskPercent)) {
      queryParams.riskPercent = this.riskPercent;
    }
    this.router.navigate(['/consultation'], { queryParams });
  }
}
