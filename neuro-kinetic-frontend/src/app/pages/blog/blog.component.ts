import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlogPost, BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit {
  searchQuery = '';

  constructor(private router: Router, private blogService: BlogService) {}

  ngOnInit(): void {
    this.blogService.loadPosts().subscribe({
      error: () => {
        // Fallback posts are already set in the service.
      }
    });
  }

  get newsArticles(): BlogPost[] {
    return this.filteredByCategory('news');
  }

  get researchArticles(): BlogPost[] {
    return this.filteredByCategory('research');
  }

  get caseStudyArticles(): BlogPost[] {
    return this.filteredByCategory('case-study');
  }

  get heroPost(): BlogPost | null {
    return this.blogService.getFeaturedPosts(1)[0] ?? this.blogService.getPosts()[0] ?? null;
  }

  get featuredWidePost(): BlogPost | null {
    const featured = this.blogService.getFeaturedPosts(2);
    if (featured.length > 1) return featured[1];
    return this.blogService.getPosts()[1] ?? null;
  }

  goToNeuroSync(): void {
    this.router.navigate(['/landing']);
  }

  tryFree(): void {
    this.router.navigate(['/patient-test']);
  }

  postLink(post: BlogPost): string {
    return `/blog/${post.id}`;
  }

  private filteredByCategory(category: 'news' | 'research' | 'case-study'): BlogPost[] {
    const query = this.searchQuery.trim().toLowerCase();
    const posts = this.blogService.getPostsByCategory(category);
    if (!query) {
      return posts;
    }

    return posts.filter((post) =>
      post.title.toLowerCase().includes(query) ||
      post.desc.toLowerCase().includes(query) ||
      post.tag.toLowerCase().includes(query)
    );
  }
}
