import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.scss']
})
export class ConsultationComponent implements OnInit {
  riskPercent: number | null = null;
  mode: 'voice' | 'gait' | 'multimodal' = 'voice';
  hasParams = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const r = params['riskPercent'];
      const value = r !== undefined && r !== null && r !== '' ? Number(r) : null;
      this.riskPercent = value != null && !isNaN(value) ? value : null;
      this.mode = (params['mode'] === 'gait' || params['mode'] === 'multimodal') ? params['mode'] : 'voice';
      this.hasParams = true;
    });
  }

  goToTest(): void {
    this.router.navigate(['/patient-test']);
  }
}
