import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { ContactMessageItem, PagedResult } from '../../models/api.models';

@Component({
  selector: 'app-contact-messages',
  templateUrl: './contact-messages.component.html',
  styleUrls: ['./contact-messages.component.scss']
})
export class ContactMessagesComponent implements OnInit {
  items: ContactMessageItem[] = [];
  loading = false;
  error = '';
  deletingId: number | null = null;

  searchTerm = '';
  filterSubject = '';
  failedOnly = false;
  sortOrder: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  hasPrevious = false;
  hasNext = false;
  failedCount = 0;

  /** NeuroSync confirmation modal (ns-modal) */
  showDeleteMessageDialog = false;
  messagePendingDelete: ContactMessageItem | null = null;

  readonly subjectOptions = [
    { label: 'All Subjects', value: '' },
    { label: 'General Inquiry', value: 'General Inquiry' },
    { label: 'Sales Information', value: 'Sales Information' },
    { label: 'Technical Support', value: 'Technical Support' },
    { label: 'Partnership Opportunity', value: 'Partnership Opportunity' },
    { label: 'Clinical Integration', value: 'Clinical Integration' }
  ];

  constructor(private apiService: ApiService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.apiService.getContactMessages({
      pageNumber: 1,
      pageSize: 1,
      searchTerm: this.searchTerm || undefined,
      subject: this.filterSubject || undefined,
      failedOnly: true,
      sortOrder: this.sortOrder
    }).subscribe({
      next: (res: PagedResult<ContactMessageItem>) => {
        this.failedCount = res.totalCount;
      },
      error: () => {
        this.failedCount = 0;
      }
    });

    this.apiService.getContactMessages({
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined,
      subject: this.filterSubject || undefined,
      failedOnly: this.failedOnly,
      sortOrder: this.sortOrder
    }).subscribe({
      next: (res: PagedResult<ContactMessageItem>) => {
        this.items = res.items;
        this.totalCount = res.totalCount;
        this.totalPages = res.totalPages;
        this.hasPrevious = res.hasPrevious;
        this.hasNext = res.hasNext;
        this.currentPage = res.pageNumber;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load contact messages.';
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterSubject = '';
    this.failedOnly = false;
    this.currentPage = 1;
    this.load();
  }

  toggleFailedOnly(): void {
    this.failedOnly = !this.failedOnly;
    this.currentPage = 1;
    this.load();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.currentPage = 1;
    this.load();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.load();
  }

  previousPage(): void {
    if (!this.hasPrevious) return;
    this.currentPage -= 1;
    this.load();
  }

  nextPage(): void {
    if (!this.hasNext) return;
    this.currentPage += 1;
    this.load();
  }

  openDeleteMessageDialog(item: ContactMessageItem): void {
    this.messagePendingDelete = item;
    this.showDeleteMessageDialog = true;
  }

  cancelDeleteMessage(): void {
    this.showDeleteMessageDialog = false;
    this.messagePendingDelete = null;
  }

  confirmDeleteMessage(): void {
    const item = this.messagePendingDelete;
    if (!item) {
      return;
    }
    this.deletingId = item.id;
    this.apiService.deleteContactMessage(item.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.showDeleteMessageDialog = false;
        this.messagePendingDelete = null;
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Contact message deleted.' });
        if (this.items.length === 1 && this.currentPage > 1) this.currentPage -= 1;
        this.load();
      },
      error: () => {
        this.deletingId = null;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete message.' });
      }
    });
  }

  getEmailBadgeClass(sent?: boolean): string {
    return sent
      ? 'status-badge status-badge--ok'
      : 'status-badge status-badge--fail';
  }

  getEmailStatusText(sent?: boolean): string {
    return sent ? 'Sent' : 'Failed';
  }

  Math = Math;
}

