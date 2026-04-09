import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ChatConversation, PagedResult, UserTestRecord } from '../../models/api.models';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  loading = true;
  error = '';
  currentUser: any = null;

  stats = {
    totalTests: 0,
    completedTests: 0,
    pendingTests: 0,
    failedTests: 0,
    positiveTests: 0,
    negativeTests: 0,
    uncertainTests: 0,
    voiceTests: 0,
    gaitTests: 0,
    fingerTappingTests: 0,
    consultationSessions: 0,
    ragInteractions: 0,
    averageAccuracy: 0
  };

  recentTests: UserTestRecord[] = [];
  recentConversations: ChatConversation[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/landing']);
      return;
    }

    const user = this.authService.getCurrentUser();
    this.currentUser = user;

    if (!user) {
      this.router.navigate(['/landing']);
      return;
    }

    if (user.role === 'Admin') {
      this.router.navigate(['/admin-dashboard']);
      return;
    }

    if (user.role === 'MedicalProfessional') {
      this.router.navigate(['/clinician']);
      return;
    }

    this.loadPublicDashboard();
  }

  goToTakeTest(): void {
    this.router.navigate(['/patient-test']);
  }

  goToTests(): void {
    this.router.navigate(['/test-records']);
  }

  goToConsultation(): void {
    this.router.navigate(['/consultation']);
  }

  goToChatHistory(): void {
    this.router.navigate(['/chat-history']);
  }

  private loadPublicDashboard(): void {
    const countRequest = (params: any) =>
      this.apiService.getUserTestRecords({
        pageNumber: 1,
        pageSize: 1,
        userId: this.currentUser?.id,
        ...params
      }).pipe(map((res: PagedResult<UserTestRecord>) => res.totalCount || 0));

    forkJoin({
      totalTests: countRequest({}),
      completedTests: countRequest({ status: 'Completed' }),
      pendingTests: countRequest({ status: 'Pending' }),
      failedTests: countRequest({ status: 'Failed' }),
      positiveTests: countRequest({ testResult: 'Positive' }),
      negativeTests: countRequest({ testResult: 'Negative' }),
      uncertainTests: countRequest({ testResult: 'Uncertain' }),
      voiceTests: countRequest({ testType: 'voice' }),
      gaitTests: countRequest({ testType: 'gait' }),
      fingerTappingTests: countRequest({ testType: 'fingertapping' }),
      recentTests: this.apiService.getUserTestRecords({
        pageNumber: 1,
        pageSize: 5,
        sortBy: 'testDate',
        sortOrder: 'desc',
        userId: this.currentUser?.id
      }),
      chatSummary: this.loadChatSummary()
    }).pipe(
      catchError(() => {
        this.error = 'Unable to load dashboard data right now.';
        return of(null);
      })
    ).subscribe((result) => {
      this.loading = false;
      if (!result) {
        return;
      }

      const recentTests = result.recentTests.items || [];
      const completedRecords = recentTests.filter((r) => r.status === 'Completed');
      const avgAccuracy = completedRecords.length
        ? completedRecords.reduce((sum, r) => sum + (r.accuracy || 0), 0) / completedRecords.length
        : 0;

      this.stats = {
        ...this.stats,
        totalTests: result.totalTests,
        completedTests: result.completedTests,
        pendingTests: result.pendingTests,
        failedTests: result.failedTests,
        positiveTests: result.positiveTests,
        negativeTests: result.negativeTests,
        uncertainTests: result.uncertainTests,
        voiceTests: result.voiceTests,
        gaitTests: result.gaitTests,
        fingerTappingTests: result.fingerTappingTests,
        consultationSessions: result.chatSummary.totalConversations,
        ragInteractions: result.chatSummary.totalMessages,
        averageAccuracy: avgAccuracy
      };

      this.recentTests = recentTests;
      this.recentConversations = result.chatSummary.recentConversations;
    });
  }

  private loadChatSummary() {
    return this.apiService.getChatConversations({
      pageNumber: 1,
      pageSize: 1,
      sortOrder: 'desc'
    }).pipe(
      switchMap((firstPage) => {
        const total = firstPage.totalCount || 0;
        if (total === 0) {
          return of({
            totalConversations: 0,
            totalMessages: 0,
            recentConversations: [] as ChatConversation[]
          });
        }

        const pageSize = 100;
        const totalPages = Math.ceil(total / pageSize);
        const requests = Array.from({ length: totalPages }, (_, idx) =>
          this.apiService.getChatConversations({
            pageNumber: idx + 1,
            pageSize,
            sortOrder: 'desc'
          })
        );

        return forkJoin(requests).pipe(
          map((pages) => {
            const items = pages.flatMap((p) => p.items || []);
            const sorted = [...items].sort((a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            return {
              totalConversations: total,
              totalMessages: items.reduce((sum, item) => sum + (item.messageCount || 0), 0),
              recentConversations: sorted.slice(0, 5)
            };
          })
        );
      }),
      catchError(() => of({
        totalConversations: 0,
        totalMessages: 0,
        recentConversations: [] as ChatConversation[]
      }))
    );
  }
}
