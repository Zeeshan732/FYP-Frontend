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
  conversationId: number | null = null;

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
      const cidRaw = params['cid'];
      const cid = cidRaw !== undefined && cidRaw !== null && cidRaw !== '' ? Number(cidRaw) : null;
      this.conversationId = cid != null && !isNaN(cid) ? cid : null;
      this.hasParams = true;
    });
  }

  goToTest(): void {
    this.router.navigate(['/patient-test']);
  }

  startNewChat(): void {
    this.conversationId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cid: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onConversationCreated(conversationId: number): void {
    this.conversationId = conversationId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cid: conversationId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onConversationUnavailable(): void {
    this.conversationId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cid: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
