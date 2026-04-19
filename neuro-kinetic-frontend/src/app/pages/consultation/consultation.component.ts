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
      const cidParsed = cidRaw !== undefined && cidRaw !== null && cidRaw !== '' ? Number(cidRaw) : null;
      const cidFromUrl = cidParsed != null && !isNaN(cidParsed) ? cidParsed : null;
      if (cidFromUrl != null) {
        this.conversationId = cidFromUrl;
      } else if (cidRaw !== undefined) {
        // `cid` present but empty/invalid — treat as cleared (e.g. explicit reset).
        this.conversationId = null;
      }
      // When `cid` is absent from the query string, keep `conversationId` as-is so a brief
      // subscription tick before `router.navigate` merges `cid` does not wipe a new thread id.
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
