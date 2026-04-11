import { Component, EventEmitter, Input, Output } from '@angular/core';

type LoaderVariant = 'page' | 'card' | 'inline' | 'button' | 'dots';
type LoaderSignal = 'tap' | 'voice' | 'gait' | 'default';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {
  @Input() variant: LoaderVariant = 'page';
  @Input() signal: LoaderSignal = 'default';
  @Input() title = 'Loading...';
  @Input() subtitle = 'Please wait a moment.';
  @Input() steps: { text: string; done: boolean; active: boolean }[] = [];
  @Input() showCancel = false;
  /** When set (e.g. 0–100), shows an upload progress strip inside the card — keeps layout on one surface */
  @Input() uploadPercent: number | null = null;
  /** Tighter padding / full-bleed friendly (e.g. patient-test modal on phones) */
  @Input() compact = false;
  @Output() cancelClick = new EventEmitter<void>();

  get signalColor(): string {
    const map: Record<LoaderSignal, string> = {
      tap: '#1D9E75',
      voice: '#2E86DE',
      gait: '#7F77DD',
      default: '#2E86DE',
    };
    return map[this.signal];
  }

  get signalColorAlpha(): string {
    const map: Record<LoaderSignal, string> = {
      tap: 'rgba(29,158,117,0.12)',
      voice: 'rgba(46,134,222,0.12)',
      gait: 'rgba(127,119,221,0.12)',
      default: 'rgba(46,134,222,0.12)',
    };
    return map[this.signal];
  }
}

