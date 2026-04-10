import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { ChatConversation, ChatMessage, PagedResult } from '../../models/api.models';

@Component({
  selector: 'app-chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.scss']
})
export class ChatHistoryComponent implements OnInit {
  items: ChatConversation[] = [];
  loading = false;
  deletingId: number | null = null;
  bulkDeleting = false;
  error = '';
  selectedIds = new Set<number>();

  showDeleteChatDialog = false;
  chatPendingDelete: ChatConversation | null = null;

  showBulkDeleteDialog = false;

  showChatDetailModal = false;
  chatDetail: ChatConversation | null = null;
  chatDetailMessages: ChatMessage[] = [];
  chatDetailLoading = false;
  chatDetailError = '';

  searchTerm = '';
  sortOrder: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  hasPrevious = false;
  hasNext = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.apiService.getChatConversations({
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined,
      sortOrder: this.sortOrder
    }).subscribe({
      next: (res: PagedResult<ChatConversation>) => {
        this.items = res.items;
        this.selectedIds.clear();
        this.totalCount = res.totalCount;
        this.totalPages = res.totalPages;
        this.hasPrevious = res.hasPrevious;
        this.hasNext = res.hasNext;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load chat history.';
      }
    });
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.load();
  }

  clearFilter(): void {
    this.searchTerm = '';
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

  nextPage(): void {
    if (!this.hasNext) return;
    this.currentPage += 1;
    this.load();
  }

  previousPage(): void {
    if (!this.hasPrevious) return;
    this.currentPage -= 1;
    this.load();
  }

  openConversation(item: ChatConversation): void {
    const conversationId = item.id;
    this.chatDetail = item;
    this.chatDetailMessages = [];
    this.chatDetailError = '';
    this.chatDetailLoading = true;
    this.showChatDetailModal = true;
    this.apiService.getChatMessages(conversationId).subscribe({
      next: (messages) => {
        if (this.chatDetail?.id !== conversationId) {
          return;
        }
        this.chatDetailMessages = messages;
        this.chatDetailLoading = false;
      },
      error: () => {
        if (this.chatDetail?.id !== conversationId) {
          return;
        }
        this.chatDetailLoading = false;
        this.chatDetailError = 'Could not load messages for this conversation.';
      }
    });
  }

  closeChatDetailModal(): void {
    this.showChatDetailModal = false;
    this.chatDetail = null;
    this.chatDetailMessages = [];
    this.chatDetailError = '';
    this.chatDetailLoading = false;
  }

  openConsultation(): void {
    this.router.navigate(['/consultation']);
  }

  get chatDetailSubtext(): string | null {
    const c = this.chatDetail;
    if (!c) {
      return null;
    }
    const n = c.messageCount;
    const when = new Date(c.updatedAt).toLocaleString();
    return `${n} message${n === 1 ? '' : 's'} · Last activity ${when}`;
  }

  get hasAnySelection(): boolean {
    return this.selectedIds.size > 0;
  }

  get isAllSelected(): boolean {
    return this.items.length > 0 && this.items.every(i => this.selectedIds.has(i.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds.clear();
      return;
    }
    this.selectedIds = new Set(this.items.map(i => i.id));
  }

  toggleSelection(itemId: number): void {
    if (this.selectedIds.has(itemId)) {
      this.selectedIds.delete(itemId);
      return;
    }
    this.selectedIds.add(itemId);
  }

  openDeleteChatDialog(item: ChatConversation): void {
    this.chatPendingDelete = item;
    this.showDeleteChatDialog = true;
  }

  cancelDeleteChat(): void {
    this.showDeleteChatDialog = false;
    this.chatPendingDelete = null;
  }

  confirmDeleteChat(): void {
    const item = this.chatPendingDelete;
    if (!item) {
      return;
    }
    this.deletingId = item.id;
    this.apiService.deleteChatConversation(item.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.showDeleteChatDialog = false;
        this.chatPendingDelete = null;
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Chat removed successfully.' });
        if (this.items.length === 1 && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        this.load();
      },
      error: () => {
        this.deletingId = null;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete chat.' });
      }
    });
  }

  openBulkDeleteDialog(): void {
    if (!this.hasAnySelection || this.bulkDeleting) {
      return;
    }
    this.showBulkDeleteDialog = true;
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteDialog = false;
  }

  confirmBulkDelete(): void {
    this.showBulkDeleteDialog = false;
    this.executeBulkDelete();
  }

  private executeBulkDelete(): void {
    if (!this.hasAnySelection || this.bulkDeleting) return;
    this.bulkDeleting = true;

    const ids = Array.from(this.selectedIds);
    let done = 0;
    let failed = 0;

    ids.forEach(id => {
      this.apiService.deleteChatConversation(id).subscribe({
        next: () => {
          done += 1;
          if (done + failed === ids.length) {
            this.finishBulkDelete(done, failed);
          }
        },
        error: () => {
          failed += 1;
          if (done + failed === ids.length) {
            this.finishBulkDelete(done, failed);
          }
        }
      });
    });
  }

  private finishBulkDelete(done: number, failed: number): void {
    this.bulkDeleting = false;
    this.selectedIds.clear();

    if (done > 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Deleted',
        detail: `${done} chat${done > 1 ? 's' : ''} removed.`
      });
    }

    if (failed > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Partial',
        detail: `${failed} chat${failed > 1 ? 's' : ''} could not be deleted.`
      });
    }

    this.load();
  }

  Math = Math;
}

