import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { AccountRequest, PagedResult } from '../../models/api.models';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-account-requests',
  templateUrl: './account-requests.component.html',
  styleUrls: ['./account-requests.component.scss']
})
export class AccountRequestsComponent implements OnInit, OnDestroy {
  requests: AccountRequest[] = [];
  loading = false;
  error = '';
  statusFilter: 'Pending' | 'Approved' | 'Rejected' | 'Inactive' | '' = 'Pending';
  /** API value; use "Clinicians only" in UI. */
  roleFilter: '' | 'MedicalProfessional' = 'MedicalProfessional';
  searchTerm = '';
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  showModal = false;
  selectedUser: AccountRequest | null = null;
  modalComment = '';
  processing = false;

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  roleOptions = [
    { label: 'Clinicians only', value: 'MedicalProfessional' },
    { label: 'All roles', value: '' }
  ];
  Math = Math;
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.searchTerm = term;
        this.pageNumber = 1;
        this.loadRequests();
      });

    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests(): void {
    this.loading = true;
    this.error = '';
    this.apiService.getAccountRequests({
      status: (this.statusFilter || undefined) as any,
      role: this.roleFilter || undefined,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      search: this.searchTerm || undefined
    }).subscribe({
      next: (res: PagedResult<AccountRequest>) => {
        this.requests = res.items;
        this.totalCount = res.totalCount;
        this.pageNumber = res.pageNumber;
        this.pageSize = res.pageSize;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load account requests', err);
        this.error = err.error?.message || 'Could not load account requests.';
        this.loading = false;
      }
    });
  }

  changePage(direction: 'prev' | 'next') {
    if (direction === 'prev' && this.pageNumber > 1) {
      this.pageNumber--;
      this.loadRequests();
    } else if (direction === 'next' && (this.pageNumber * this.pageSize) < this.totalCount) {
      this.pageNumber++;
      this.loadRequests();
    }
  }

  updateStatus(request: AccountRequest, status: 'Approved' | 'Rejected' | 'Pending' | 'Inactive', comment?: string) {
    this.loading = true;
    this.apiService.updateAccountStatus(request.id, { status, comment }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status updated',
          detail: `${request.email} → ${status}${comment ? ` (${comment})` : ''}`
        });
        this.loadRequests();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Update failed',
          detail: err.error?.message || 'Unable to update account status.'
        });
        this.loading = false;
      }
    });
  }

  onFilterChange() {
    this.pageNumber = 1;
    this.loadRequests();
  }

  onSearchChange(term: string) {
    this.search$.next(term);
  }

  /** Display label for API role values (e.g. MedicalProfessional → Clinician). */
  getRoleLabel(role?: string): string {
    switch (role) {
      case 'MedicalProfessional':
        return 'Clinician';
      case 'Public':
        return 'Patient';
      case 'Admin':
        return 'Admin';
      default:
        return role || '—';
    }
  }

  openModal(req: AccountRequest) {
    this.selectedUser = { ...req };
    this.modalComment = req.comment || '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
    this.modalComment = '';
    this.processing = false;
  }

  submitStatus(status: 'Approved' | 'Rejected' | 'Pending' | 'Inactive') {
    if (!this.selectedUser) return;
    this.processing = true;
    this.apiService.updateAccountStatus(this.selectedUser.id, {
      status,
      comment: this.modalComment || undefined
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status updated',
          detail: `${this.selectedUser?.email} → ${status}${this.modalComment ? ` (${this.modalComment})` : ''}`
        });
        this.closeModal();
        this.loadRequests();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Update failed',
          detail: err.error?.message || 'Unable to update account status.'
        });
        this.processing = false;
      }
    });
  }
}

