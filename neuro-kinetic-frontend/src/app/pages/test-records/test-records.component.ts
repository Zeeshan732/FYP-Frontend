import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { 
  UserTestRecord, 
  PagedResult, 
  TrendAnalysisDto,
  ComparisonDto
} from '../../models/api.models';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-test-records',
  templateUrl: './test-records.component.html',
  styleUrls: ['./test-records.component.scss']
})
export class TestRecordsComponent implements OnInit {
  records: UserTestRecord[] = [];
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
  filterStatus: string = '';
  filterResult: string = '';
  filterTestType: string = '';
  sortBy: string = 'testDate';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Dropdown options
  statusFilterOptions = [
    { label: 'All Status', value: '' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Failed', value: 'Failed' }
  ];

  resultFilterOptions = [
    { label: 'All Results', value: '' },
    { label: 'Positive', value: 'Positive' },
    { label: 'Negative', value: 'Negative' },
    { label: 'Uncertain', value: 'Uncertain' }
  ];

  testTypeFilterOptions = [
    { label: 'All Categories', value: '' },
    { label: 'voice', value: 'voice' },
    { label: 'gait', value: 'gait' },
    { label: 'fingertapping', value: 'fingertapping' }
  ];

  sortOptions = [
    { label: 'Sort by Date', value: 'testDate' },
    { label: 'Sort by Accuracy', value: 'accuracy' },
    { label: 'Sort by Risk', value: 'riskPercent' },
    { label: 'Sort by Result', value: 'testResult' }
  ];

  // Compact filter menu (opened from filter icon)
  showFilterMenu = false;

  toggleFilterMenu() {
    this.showFilterMenu = !this.showFilterMenu;
  }

  applyFilters() {
    this.currentPage = 1;
    this.showFilterMenu = false;
    this.loadRecords();
  }

  // User info
  currentUser: any = null;
  isAdmin = false;

  // Dialog state
  showDialog: boolean = false;
  selectedRecord: UserTestRecord | null = null;
  isEditMode: boolean = false;

  // Delete modal state
  showDeleteDialog: boolean = false;
  deleteRecordId: number | null = null;
  deleting: boolean = false;

  // Trend analysis
  trendData: TrendAnalysisDto | null = null;
  loadingTrends = false;
  showTrends = false;

  // Comparison
  comparisonData: ComparisonDto | null = null;
  loadingComparison = false;
  showComparison = false;
  selectedRecord1: number | null = null;
  selectedRecord2: number | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.loadRecords();
    });
  }

  loadRecords() {
    this.loading = true;
    this.error = '';

    const params: any = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    // Filter by user if not admin
    if (!this.isAdmin && this.currentUser?.id) {
      params.userId = this.currentUser.id;
    }

    // Apply filters
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterResult) {
      params.testResult = this.filterResult;
    }
    if (this.filterTestType) {
      params.testType = this.filterTestType;
    }

    this.apiService.getUserTestRecords(params).subscribe({
      next: (response: PagedResult<UserTestRecord>) => {
        this.records = response.items;
        this.currentPage = response.pageNumber;
        this.totalPages = response.totalPages;
        this.totalCount = response.totalCount;
        this.hasPrevious = response.hasPrevious;
        this.hasNext = response.hasNext;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading test records:', error);
        this.error = 'Failed to load test records. Please try again.';
        this.loading = false;
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadRecords();
  }

  onSortChange(sortBy: string) {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    this.loadRecords();
  }

  getSortIcon(columnName: string): string {
    if (this.sortBy === columnName) {
      return this.sortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  }

  isColumnSorted(columnName: string): boolean {
    return this.sortBy === columnName;
  }

  clearFilters() {
    this.filterStatus = '';
    this.filterResult = '';
    this.filterTestType = '';
    this.currentPage = 1;
    this.loadRecords();
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.loadRecords();
    }
  }

  previousPage() {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadRecords();
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.loadRecords();
  }

  openDeleteDialog(recordId: number) {
    this.deleteRecordId = recordId;
    this.showDeleteDialog = true;
  }

  confirmDelete() {
    if (this.deleteRecordId == null) return;
    this.deleting = true;
    this.apiService.deleteUserTestRecord(this.deleteRecordId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Test record deleted successfully'
        });
        this.deleting = false;
        this.showDeleteDialog = false;
        this.deleteRecordId = null;
        this.loadRecords();
      },
      error: (error) => {
        console.error('Error deleting record:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete test record. Please try again.'
        });
        this.deleting = false;
      }
    });
  }

  cancelDelete() {
    this.showDeleteDialog = false;
    this.deleteRecordId = null;
  }

  viewRecord(id: number) {
    this.apiService.getUserTestRecord(id).subscribe({
      next: (record) => {
        this.selectedRecord = record;
        this.isEditMode = false;
        this.showDialog = true;
      },
      error: (error) => {
        console.error('Error loading record:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test record. Please try again.'
        });
      }
    });
  }

  editRecord(id: number) {
    this.apiService.getUserTestRecord(id).subscribe({
      next: (record) => {
        this.selectedRecord = record;
        this.isEditMode = true;
        this.showDialog = true;
      },
      error: (error) => {
        console.error('Error loading record:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test record. Please try again.'
        });
      }
    });
  }

  onSaveRecord(updatedRecord: UserTestRecord) {
    this.apiService.updateUserTestRecord(updatedRecord.id, updatedRecord).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Test record updated successfully'
        });
        this.showDialog = false;
        this.loadRecords();
      },
      error: (error) => {
        console.error('Error updating record:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update test record. Please try again.'
        });
      }
    });
  }

  onCancelDialog() {
    this.showDialog = false;
    this.selectedRecord = null;
  }

  takeNewTest() {
    this.router.navigate(['/patient-test']);
  }

  getResultBadgeColor(result: string): string {
    switch (result) {
      case 'Positive':
        return 'risk-badge-critical';
      case 'Negative':
        return 'risk-badge-healthy';
      case 'Uncertain':
        return 'risk-badge-warning';
      default:
        return 'risk-badge-warning';
    }
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'Completed':
        return 'risk-badge-healthy';
      case 'Pending':
        return 'risk-badge-warning';
      case 'Failed':
        return 'risk-badge-critical';
      default:
        return 'risk-badge-warning';
    }
  }

  getTestCategoryLabel(testType?: string): string {
    switch (testType) {
      case 'voice':
        return 'voice';
      case 'gait':
        return 'gait';
      case 'fingertapping':
        return 'fingertapping';
      default:
        return '—';
    }
  }

  hasActiveFilters(): boolean {
    return !!(this.filterStatus || this.filterResult || this.filterTestType);
  }

  // Helper for template
  Math = Math;

  // ========== TREND ANALYSIS ==========

  loadTrends() {
    if (!this.currentUser?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'User ID not available for trend analysis.'
      });
      return;
    }

    this.loadingTrends = true;
    this.apiService.getUserTrends(this.currentUser.id).subscribe({
      next: (trends) => {
        this.trendData = trends;
        this.loadingTrends = false;
        this.showTrends = true;
      },
      error: (error) => {
        console.error('Error loading trends:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load trend analysis. Please try again.'
        });
        this.loadingTrends = false;
      }
    });
  }

  closeTrends() {
    this.showTrends = false;
    this.trendData = null;
  }

  // ========== COMPARISON ==========

  openComparisonDialog(recordId1: number, recordId2?: number) {
    this.selectedRecord1 = recordId1;
    this.selectedRecord2 = recordId2 || null;
    this.showComparison = true;
    
    if (recordId2) {
      this.compareRecords(recordId1, recordId2);
    }
  }

  compareRecords(recordId1: number, recordId2: number) {
    if (!recordId1 || !recordId2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select two records to compare.'
      });
      return;
    }

    this.loadingComparison = true;
    this.apiService.compareTestRecords(recordId1, recordId2).subscribe({
      next: (comparison) => {
        this.comparisonData = comparison;
        this.loadingComparison = false;
      },
      error: (error) => {
        console.error('Error comparing records:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.status === 404 
            ? 'One or both records not found.' 
            : 'Failed to compare records. Please try again.'
        });
        this.loadingComparison = false;
      }
    });
  }

  closeComparison() {
    this.showComparison = false;
    this.comparisonData = null;
    this.selectedRecord1 = null;
    this.selectedRecord2 = null;
  }

  selectRecordForComparison(recordId: number) {
    if (!this.selectedRecord1) {
      this.selectedRecord1 = recordId;
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'First record selected. Please select a second record to compare.'
      });
    } else if (this.selectedRecord1 === recordId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a different record to compare.'
      });
    } else {
      this.selectedRecord2 = recordId;
      this.compareRecords(this.selectedRecord1, recordId);
    }
  }

  getRiskLevelColor(riskLevel?: string): string {
    switch (riskLevel) {
      case 'High':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'Moderate':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'Low':
        return 'bg-green-500/20 border-green-500 text-green-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  }

  /**
   * Get risk percentage for display: from record.riskPercent (API) or parsed from analysisNotes.
   * analysisNotes format: "Analysis completed. Risk: 43% (Moderate). Session: ..."
   */
  getRiskPercent(record: UserTestRecord): number | null {
    if (record.riskPercent != null && !isNaN(record.riskPercent)) {
      return record.riskPercent;
    }
    const notes = record.analysisNotes || '';
    const match = notes.match(/Risk:\s*(\d+(?:\.\d+)?)\s*%/);
    return match ? parseFloat(match[1]) : null;
  }

  /** Format risk for table: "43%" or "—" when missing. */
  getRiskDisplay(record: UserTestRecord): string {
    const risk = this.getRiskPercent(record);
    return risk != null ? `${Math.round(risk)}%` : '—';
  }
}

