import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-section-row',
  templateUrl: './section-row.component.html',
  styleUrls: ['./section-row.component.scss']
})
export class SectionRowComponent {
  @Input() title = '';
  @Input() viewAllHref = '';
}
