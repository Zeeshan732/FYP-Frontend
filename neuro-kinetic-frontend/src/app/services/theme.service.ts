import { Injectable } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'default';

const STORAGE_KEY = 'neurosync-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _current: AppTheme = 'default';
  private _resolved: 'light' | 'dark' = 'light';
  private mediaQuery?: MediaQueryList;
  private mediaListener?: (e: MediaQueryListEvent) => void;

  constructor() {
    this._current = (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'default';
    this.initSystemListener();
    this.apply();
  }

  get current(): AppTheme {
    return this._current;
  }

  get resolved(): 'light' | 'dark' {
    return this._resolved;
  }

  setTheme(theme: AppTheme): void {
    this._current = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    this.apply();
  }

  private getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private initSystemListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaListener = () => {
      if (this._current === 'default') {
        this._resolved = this.getSystemPreference();
        this.apply();
      }
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
  }

  private apply(): void {
    if (this._current === 'default') {
      this._resolved = this.getSystemPreference();
    } else {
      this._resolved = this._current;
    }
    const doc = document.documentElement;
    doc.setAttribute('data-theme', this._resolved);
    if (this._resolved === 'dark') {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
    }
  }
}
