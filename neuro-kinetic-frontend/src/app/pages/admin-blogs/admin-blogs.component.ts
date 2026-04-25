import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { finalize, map, of, switchMap } from 'rxjs';
import {
  BlogCategory,
  BlogIconType,
  BlogPost,
  BlogPostUpsertPayload,
  BlogService
} from '../../services/blog.service';

type BlogForm = BlogPostUpsertPayload;

@Component({
  selector: 'app-admin-blogs',
  templateUrl: './admin-blogs.component.html',
  styleUrls: ['./admin-blogs.component.scss']
})
export class AdminBlogsComponent implements OnInit {
  posts: BlogPost[] = [];

  isEditing = false;
  isSaving = false;
  isUploading = false;
  editingId: number | null = null;

  form: BlogForm = this.emptyForm();
  selectedFeaturedFile: File | null = null;
  previewImageUrl = this.blogService.resolveImageUrl({});

  readonly maxImageSizeBytes = 5 * 1024 * 1024;
  readonly allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];

  readonly categories: Array<{ label: string; value: BlogCategory }> = [
    { label: 'News', value: 'news' },
    { label: 'Research', value: 'research' },
    { label: 'Case Study', value: 'case-study' }
  ];

  readonly iconTypes: Array<{ label: string; value: BlogIconType }> = [
    { label: 'Voice', value: 'voice' },
    { label: 'Gait', value: 'gait' },
    { label: 'Tap', value: 'tap' },
    { label: 'Research', value: 'research' },
    { label: 'Case Study', value: 'case-study' }
  ];

  constructor(private blogService: BlogService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.refresh();
  }

  save(): void {
    if (this.isSaving || this.isUploading) return;

    const basicValidationError = this.validateBasicForm();
    if (basicValidationError) {
      this.toast('warn', 'Missing fields', basicValidationError);
      return;
    }

    if (this.form.featuredImageUrl?.trim() && !this.isValidUrl(this.form.featuredImageUrl)) {
      this.toast('warn', 'Invalid URL', 'Featured image URL must be a valid HTTP or HTTPS URL.');
      return;
    }

    this.isSaving = true;
    this.uploadSelectedImageIfAny().pipe(
      switchMap((uploadedPath) => {
        const payload = this.buildPayload(uploadedPath);
        if (this.isEditing && this.editingId != null) {
          return this.blogService.updatePost(this.editingId, payload);
        }
        return this.blogService.createPost(payload);
      }),
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: () => {
        this.toast('success', this.isEditing ? 'Blog updated' : 'Blog added', 'Blog post saved successfully.');
        this.cancelEdit();
        this.refresh();
      },
      error: (error) => {
        this.toast('error', 'Save failed', this.getErrorMessage(error, 'Unable to save blog post.'));
      }
    });
  }

  edit(post: BlogPost): void {
    this.isEditing = true;
    this.editingId = post.id;
    this.selectedFeaturedFile = null;
    this.form = {
      category: post.category,
      thumbBg: post.thumbBg,
      thumbLabel: post.thumbLabel,
      tag: post.tag,
      tagColor: post.tagColor,
      title: post.title,
      desc: post.desc,
      date: post.date,
      metaOverride: post.metaOverride ?? '',
      iconType: post.iconType ?? 'research',
      isFeatured: !!post.isFeatured,
      featuredImagePath: post.featuredImagePath ?? '',
      featuredImageUrl: post.featuredImageUrl ?? ''
    };
    this.updatePreview();
  }

  delete(post: BlogPost): void {
    this.blogService.deletePost(post.id).subscribe({
      next: () => {
        this.toast('success', 'Blog deleted', 'Blog post deleted successfully.');
        this.refresh();
      },
      error: (error) => this.toast('error', 'Delete failed', this.getErrorMessage(error, 'Unable to delete blog post.'))
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingId = null;
    this.selectedFeaturedFile = null;
    this.form = this.emptyForm();
    this.updatePreview();
  }

  onFeaturedImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const validationError = this.validateImageFile(file);
    if (validationError) {
      this.toast('warn', 'Invalid image', validationError);
      if (input) input.value = '';
      return;
    }

    this.selectedFeaturedFile = file;
    this.readPreviewFile(file);
  }

  clearUploadedImage(): void {
    this.selectedFeaturedFile = null;
    this.form.featuredImagePath = '';
    this.updatePreview();
  }

  onImageUrlChange(): void {
    this.updatePreview();
  }

  imageSourceHint(): string {
    if (this.selectedFeaturedFile) return 'Using uploaded image';
    if (this.form.featuredImagePath?.trim()) return 'Using previously uploaded image';
    if (this.form.featuredImageUrl?.trim()) return 'Using external image URL';
    return 'Using fallback placeholder';
  }

  private refresh(): void {
    this.blogService.loadPosts().subscribe({
      next: posts => {
        this.posts = posts;
        this.updatePreview();
      },
      error: () => {
        this.posts = this.blogService.getPosts();
        this.toast('warn', 'Offline fallback', 'Unable to load from API, showing fallback posts.');
        this.updatePreview();
      }
    });
  }

  private buildPayload(uploadedPath: string | null): BlogPostUpsertPayload {
    return {
      category: this.form.category,
      iconType: this.form.iconType,
      title: this.form.title.trim(),
      tag: this.form.tag.trim(),
      tagColor: this.form.tagColor.trim(),
      thumbBg: this.form.thumbBg.trim(),
      thumbLabel: this.form.thumbLabel.trim(),
      date: this.form.date.trim(),
      metaOverride: this.form.metaOverride?.trim() || undefined,
      desc: this.form.desc.trim(),
      isFeatured: !!this.form.isFeatured,
      featuredImagePath: uploadedPath ?? (this.form.featuredImagePath?.trim() || undefined),
      featuredImageUrl: this.form.featuredImageUrl?.trim() || undefined
    };
  }

  private uploadSelectedImageIfAny() {
    if (!this.selectedFeaturedFile) {
      return of<string | null>(null);
    }

    this.isUploading = true;
    return this.blogService.uploadFeaturedImage(this.selectedFeaturedFile).pipe(
      map((response) => {
        this.form.featuredImagePath = response.imagePath;
        return response.imagePath;
      }),
      finalize(() => {
        this.isUploading = false;
      })
    );
  }

  private updatePreview(): void {
    if (this.selectedFeaturedFile) {
      return;
    }
    this.previewImageUrl = this.blogService.resolveImageUrl({
      featuredImagePath: this.form.featuredImagePath,
      featuredImageUrl: this.form.featuredImageUrl
    });
  }

  private readPreviewFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImageUrl = typeof reader.result === 'string' ? reader.result : this.blogService.resolveImageUrl({});
    };
    reader.readAsDataURL(file);
  }

  private validateBasicForm(): string | null {
    if (!this.form.title.trim()) return 'Title is required.';
    if (!this.form.tag.trim()) return 'Tag is required.';
    if (!this.form.desc.trim()) return 'Description is required.';
    return null;
  }

  private validateImageFile(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.allowedImageExtensions.includes(extension)) {
      return `Allowed image types: ${this.allowedImageExtensions.join(', ')}`;
    }
    if (file.size > this.maxImageSizeBytes) {
      return `Image size must be <= ${(this.maxImageSizeBytes / (1024 * 1024)).toFixed(0)} MB.`;
    }
    return null;
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private emptyForm(): BlogForm {
    return {
      category: 'news',
      thumbBg: '#0F2340',
      thumbLabel: '',
      tag: '',
      tagColor: '#2E86DE',
      title: '',
      desc: '',
      date: '',
      metaOverride: '',
      iconType: 'research',
      isFeatured: false,
      featuredImagePath: '',
      featuredImageUrl: ''
    };
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || fallback;
  }

  private toast(severity: 'success' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2500 });
  }
}
