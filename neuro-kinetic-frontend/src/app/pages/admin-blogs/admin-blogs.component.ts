import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BlogCategory, BlogPost, BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-admin-blogs',
  templateUrl: './admin-blogs.component.html',
  styleUrls: ['./admin-blogs.component.scss']
})
export class AdminBlogsComponent implements OnInit {
  posts: BlogPost[] = [];

  isEditing = false;
  editingId: string | null = null;

  form: Omit<BlogPost, 'id'> = this.emptyForm();

  readonly categories: Array<{ label: string; value: BlogCategory }> = [
    { label: 'News', value: 'news' },
    { label: 'Research', value: 'research' },
    { label: 'Case Study', value: 'case-study' }
  ];

  constructor(private blogService: BlogService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.refresh();
  }

  save(): void {
    if (!this.form.title.trim() || !this.form.desc.trim() || !this.form.tag.trim()) {
      this.toast('warn', 'Missing fields', 'Title, tag, and description are required.');
      return;
    }

    const payload: Omit<BlogPost, 'id'> = {
      ...this.form,
      title: this.form.title.trim(),
      desc: this.form.desc.trim(),
      tag: this.form.tag.trim(),
      thumbLabel: this.form.thumbLabel.trim(),
      date: this.form.date.trim(),
      metaOverride: this.form.metaOverride?.trim() || undefined
    };

    if (this.isEditing && this.editingId) {
      this.blogService.updatePost(this.editingId, payload);
      this.toast('success', 'Blog updated', 'Blog post updated successfully.');
    } else {
      this.blogService.createPost(payload);
      this.toast('success', 'Blog added', 'Blog post created successfully.');
    }

    this.cancelEdit();
    this.refresh();
  }

  edit(post: BlogPost): void {
    this.isEditing = true;
    this.editingId = post.id;
    this.form = { ...post };
  }

  delete(post: BlogPost): void {
    this.blogService.deletePost(post.id);
    this.refresh();
    this.toast('success', 'Blog deleted', 'Blog post deleted successfully.');
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  private refresh(): void {
    this.posts = this.blogService.getPosts();
  }

  private emptyForm(): Omit<BlogPost, 'id'> {
    return {
      category: 'news',
      thumbBg: '#0F2340',
      thumbLabel: '',
      tag: '',
      tagColor: '#2E86DE',
      title: '',
      desc: '',
      author: null,
      date: '',
      metaOverride: '',
      iconType: 'research'
    };
  }

  private toast(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
