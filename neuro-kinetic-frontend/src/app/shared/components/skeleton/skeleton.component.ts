import { Component, Input } from '@angular/core';

type SkeletonVariant = 'card' | 'table' | 'text' | 'avatar';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss']
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'card';
  @Input() rows = 3;
  @Input() cols = 3;

  get rowArray() { return Array.from({ length: this.rows }); }
  get colArray() { return Array.from({ length: this.cols }); }
  get bodyCols() { return Array.from({ length: Math.max(this.cols - 1, 0) }); }
}

