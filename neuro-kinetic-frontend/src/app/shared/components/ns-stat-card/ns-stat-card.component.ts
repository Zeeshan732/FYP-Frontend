import { Component, Input } from '@angular/core';
import { NsStatCardVariant } from './ns-stat-card.models';

@Component({
  selector: 'ns-stat-card',
  templateUrl: './ns-stat-card.component.html',
  styleUrls: ['./ns-stat-card.component.scss'],
})
export class NsStatCardComponent {
  @Input() variant: NsStatCardVariant = 'patients';
  @Input() value = 0;
  @Input() label = '';
}
