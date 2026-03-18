import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Patient } from '../../services/clinician.service';

@Component({
  selector: 'app-patient-card',
  templateUrl: './patient-card.component.html',
  styleUrls: ['./patient-card.component.scss']
})
export class PatientCardComponent {
  @Input() patient!: Patient;
  @Output() select = new EventEmitter<string>();

  riskColor(score: number): string {
    if (score < 35) return '#1D9E75';
    if (score < 65) return '#F0A500';
    return '#E05252';
  }
}
