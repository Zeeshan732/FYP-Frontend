import { Component, Input } from '@angular/core';

export interface ArticleAuthor {
  initials: string;
  name: string;
  color: string;
  colorBg: string;
}

@Component({
  selector: 'app-article-card',
  templateUrl: './article-card.component.html',
  styleUrls: ['./article-card.component.scss']
})
export class ArticleCardComponent {
  @Input() thumbBg = '#0D1B2E';
  @Input() thumbLabel = '';
  @Input() tag = '';
  @Input() tagColor = '#2E86DE';
  @Input() title = '';
  @Input() desc = '';
  @Input() author: ArticleAuthor | null = null;
  @Input() date = '';
  /** When set (e.g. "Anonymised · Mar 2026"), shown instead of author avatar + date */
  @Input() metaOverride: string | undefined = undefined;
  /** Icon type: voice (mic), gait (walking), tap (4-dot), research (bar chart), case-study (2x2 grid) */
  @Input() iconType: 'voice' | 'gait' | 'tap' | 'research' | 'case-study' = 'research';
}
