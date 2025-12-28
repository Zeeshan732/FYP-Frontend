import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { User, PagedResult } from '../../models/api.models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  hasPrevious = false;
  hasNext = false;

  // Filters
  searchTerm = '';
  roleFilter: string = '';
  statusFilter: string = '';

  roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Public', value: 'Public' },
    { label: 'Researcher', value: 'Researcher' },
    { label: 'Medical Professional', value: 'MedicalProfessional' },
    { label: 'Admin', value: 'Admin' }
  ];

  statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = '';

    const params: any = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    if (this.roleFilter) {
      params.role = this.roleFilter;
    }
    if (this.statusFilter) {
      params.status = this.statusFilter;
    }

    this.apiService.getAllUsers(params).subscribe({
      next: (response: PagedResult<User>) => {
        this.users = response.items;
        this.currentPage = response.pageNumber;
        this.totalPages = response.totalPages;
        this.totalCount = response.totalCount;
        this.hasPrevious = response.hasPrevious;
        this.hasNext = response.hasNext;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load users. Please try again.'
        });
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters() {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  previousPage() {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/20 border-purple-500 text-purple-400';
      case 'Researcher':
        return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'MedicalProfessional':
        return 'bg-cyan-500/20 border-cyan-500 text-cyan-400';
      case 'Public':
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  getStatusBadgeColor(status?: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'Pending':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'Rejected':
        return 'bg-red-500/20 border-red-500 text-red-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.roleFilter || this.statusFilter);
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'MedicalProfessional':
        return 'Medical Professional';
      default:
        return role;
    }
  }

  // Helper for template
  Math = Math;
}
