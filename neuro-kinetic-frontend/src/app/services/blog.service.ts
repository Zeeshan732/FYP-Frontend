import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ArticleAuthor } from '../components/blog/article-card/article-card.component';

export type BlogCategory = 'news' | 'research' | 'case-study';
export type BlogIconType = 'voice' | 'gait' | 'tap' | 'research' | 'case-study';

export interface BlogPost {
  id: number;
  category: BlogCategory;
  thumbBg: string;
  thumbLabel: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  author: ArticleAuthor | null;
  date: string;
  metaOverride?: string;
  iconType?: BlogIconType;
  isFeatured?: boolean;
  featuredImagePath?: string;
  featuredImageUrl?: string;
  featuredImage?: string;
}

export interface BlogPostUpsertPayload {
  category: BlogCategory;
  thumbBg: string;
  thumbLabel: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  date: string;
  metaOverride?: string;
  iconType?: BlogIconType;
  isFeatured?: boolean;
  featuredImagePath?: string;
  featuredImageUrl?: string;
}

interface BlogApiDto {
  id: number;
  category: BlogCategory;
  iconType?: BlogIconType;
  title: string;
  tag: string;
  tagColor: string;
  cardBackground: string;
  thumbnailLabel?: string;
  dateText?: string;
  metaOverride?: string;
  description: string;
  isFeatured: boolean;
  featuredImagePath?: string;
  featuredImageUrl?: string;
  featuredImage?: string;
  createdAt: string;
}

interface BlogImageUploadResponse {
  fileName: string;
  fileSize: number;
  imagePath: string;
  imageUrl: string;
}

const FALLBACK_IMAGE = '/assets/placeholders/blog-featured-placeholder.svg';

const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: -1,
    category: 'news',
    thumbBg: '#0F2340',
    thumbLabel: 'PLATFORM NEWS',
    tag: 'Platform update',
    tagColor: '#2E86DE',
    title: 'NeuroSync v2.0 launches with real-time voice tremor detection',
    desc: 'The new release adds live waveform feedback during recording and cuts analysis time to under 3 seconds.',
    author: { initials: 'AR', name: 'Dr. Ayesha Raza', color: '#2E86DE', colorBg: 'rgba(46,134,222,0.2)' },
    date: 'Feb 28',
    iconType: 'voice',
    isFeatured: true,
    featuredImage: FALLBACK_IMAGE
  },
  {
    id: -2,
    category: 'research',
    thumbBg: '#1A1640',
    thumbLabel: 'RESEARCH',
    tag: 'Research',
    tagColor: '#7F77DD',
    title: 'Gait asymmetry as an early Parkinson marker: new findings',
    desc: 'Our ML model identifies stride irregularities up to 14 months before clinical motor symptoms appear.',
    author: { initials: 'UA', name: 'Umair Azam', color: '#7F77DD', colorBg: 'rgba(127,119,221,0.2)' },
    date: 'Feb 14',
    iconType: 'gait',
    isFeatured: true,
    featuredImage: FALLBACK_IMAGE
  },
  {
    id: -3,
    category: 'case-study',
    thumbBg: '#04342C',
    thumbLabel: '',
    tag: 'Case study',
    tagColor: '#1D9E75',
    title: 'From uncertain to confirmed: how combined scoring resolved a borderline case',
    desc: 'A patient with inconclusive single-signal scores reached 84% confidence when all three biomarkers were combined.',
    author: null,
    date: '',
    metaOverride: 'Anonymised - Jan 2026',
    iconType: 'case-study',
    isFeatured: false,
    featuredImage: FALLBACK_IMAGE
  }
];

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly apiUrl = `${environment.apiUrl}/blogposts`;
  private readonly postsSubject = new BehaviorSubject<BlogPost[]>(DEFAULT_BLOG_POSTS);

  readonly posts$ = this.postsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPosts(): Observable<BlogPost[]> {
    return this.http.get<BlogApiDto[]>(this.apiUrl).pipe(
      map(items => {
        const mapped = items.map(item => this.mapDto(item));
        return mapped.length > 0 ? mapped : DEFAULT_BLOG_POSTS;
      }),
      tap(posts => this.postsSubject.next(posts))
    );
  }

  getPosts(): BlogPost[] {
    return this.postsSubject.value;
  }

  getPostById(id: number): Observable<BlogPost> {
    return this.http.get<BlogApiDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => this.mapDto(dto))
    );
  }

  getPostsByCategory(category: BlogCategory): BlogPost[] {
    return this.getPosts().filter(post => post.category === category);
  }

  getFeaturedPosts(limit = 2): BlogPost[] {
    const featured = this.getPosts().filter(post => post.isFeatured);
    return featured.slice(0, limit);
  }

  createPost(payload: BlogPostUpsertPayload): Observable<BlogPost> {
    return this.http.post<BlogApiDto>(this.apiUrl, this.mapPayload(payload)).pipe(
      map(dto => this.mapDto(dto)),
      tap((created) => this.postsSubject.next([created, ...this.getPosts()]))
    );
  }

  updatePost(id: number, payload: BlogPostUpsertPayload): Observable<BlogPost> {
    return this.http.put<BlogApiDto>(`${this.apiUrl}/${id}`, this.mapPayload(payload)).pipe(
      map(dto => this.mapDto(dto)),
      tap((updated) => {
        const next = this.getPosts().map(post => (post.id === id ? updated : post));
        this.postsSubject.next(next);
      })
    );
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.postsSubject.next(this.getPosts().filter(post => post.id !== id)))
    );
  }

  uploadFeaturedImage(file: File): Observable<BlogImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<BlogImageUploadResponse>(`${this.apiUrl}/featured-image/upload`, formData);
  }

  resolveImageUrl(post: Partial<BlogPost>): string {
    if (post.featuredImagePath?.trim()) {
      return this.toAbsoluteUploadUrl(post.featuredImagePath);
    }
    if (post.featuredImageUrl?.trim()) {
      return post.featuredImageUrl.trim();
    }
    if (post.featuredImage?.trim()) {
      return post.featuredImage.trim();
    }
    return FALLBACK_IMAGE;
  }

  toAbsoluteUploadUrl(pathOrUrl: string): string {
    const raw = (pathOrUrl ?? '').trim();
    if (!raw) return FALLBACK_IMAGE;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/uploads/')) {
      return `${this.getApiOrigin()}${raw}`;
    }
    if (raw.startsWith('uploads/')) {
      return `${this.getApiOrigin()}/${raw}`;
    }
    return `${this.getApiOrigin()}/uploads/${raw.replace(/^\/+/, '')}`;
  }

  private mapPayload(payload: BlogPostUpsertPayload) {
    return {
      category: payload.category,
      iconType: payload.iconType,
      title: payload.title,
      tag: payload.tag,
      tagColor: payload.tagColor,
      cardBackground: payload.thumbBg,
      thumbnailLabel: payload.thumbLabel || null,
      dateText: payload.date || null,
      metaOverride: payload.metaOverride || null,
      description: payload.desc,
      isFeatured: !!payload.isFeatured,
      featuredImagePath: payload.featuredImagePath || null,
      featuredImageUrl: payload.featuredImageUrl || null
    };
  }

  private mapDto(dto: BlogApiDto): BlogPost {
    const mapped: BlogPost = {
      id: dto.id,
      category: dto.category,
      iconType: dto.iconType,
      title: dto.title,
      tag: dto.tag,
      tagColor: dto.tagColor,
      thumbBg: dto.cardBackground,
      thumbLabel: dto.thumbnailLabel ?? '',
      date: dto.dateText ?? '',
      metaOverride: dto.metaOverride ?? '',
      desc: dto.description,
      author: null,
      isFeatured: dto.isFeatured,
      featuredImagePath: dto.featuredImagePath,
      featuredImageUrl: dto.featuredImageUrl
    };
    mapped.featuredImage = this.resolveImageUrl({
      featuredImagePath: dto.featuredImagePath,
      featuredImageUrl: dto.featuredImageUrl,
      featuredImage: dto.featuredImage
    });
    return mapped;
  }

  private getApiOrigin(): string {
    return environment.apiUrl.replace(/\/api\/?$/, '');
  }
}
