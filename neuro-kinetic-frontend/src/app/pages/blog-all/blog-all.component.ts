import { Component, OnInit } from '@angular/core';
import { BlogPost, BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-blog-all',
  templateUrl: './blog-all.component.html',
  styleUrls: ['./blog-all.component.scss']
})
export class BlogAllComponent implements OnInit {
  allPosts: BlogPost[] = [];
  loading = true;

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    this.blogService.loadPosts().subscribe({
      next: (posts) => {
        this.allPosts = posts;
        this.loading = false;
      },
      error: () => {
        this.allPosts = this.blogService.getPosts();
        this.loading = false;
      }
    });
  }

  postLink(post: BlogPost): string {
    return `/blog/${post.id}`;
  }
}
