import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ArticleAuthor } from '../../components/blog/article-card/article-card.component';
import { BlogService } from '../../services/blog.service';

export interface ArticleCardData {
  thumbBg: string;
  thumbLabel: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  author: ArticleAuthor | null;
  date: string;
  metaOverride?: string;
  iconType?: 'voice' | 'gait' | 'tap' | 'research' | 'case-study';
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent {
  searchQuery = '';
  constructor(private router: Router, private blogService: BlogService) {}

  get newsArticles(): ArticleCardData[] {
    return this.blogService.getPostsByCategory('news');
  }

  get researchArticles(): ArticleCardData[] {
    return this.blogService.getPostsByCategory('research');
  }

  get caseStudyArticles(): ArticleCardData[] {
    return this.blogService.getPostsByCategory('case-study');
  }

  goToNeuroSync(): void {
    this.router.navigate(['/landing']);
  }

  tryFree(): void {
    this.router.navigate(['/patient-test']);
  }
}
