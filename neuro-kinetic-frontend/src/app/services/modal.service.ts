import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AskResultsDialogState {
  visible: boolean;
  riskPercent: number | null;
  mode: 'voice' | 'gait' | 'multimodal';
}

/** App-root global notice (e.g. OTP expired) — PrimeNG dialog in app.component */
export interface GlobalNoticeState {
  visible: boolean;
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private loginModalSubject = new BehaviorSubject<boolean>(false);
  private signupModalSubject = new BehaviorSubject<boolean>(false);
  private askResultsDialogSubject = new BehaviorSubject<AskResultsDialogState>({
    visible: false,
    riskPercent: null,
    mode: 'voice'
  });

  private globalNoticeSubject = new BehaviorSubject<GlobalNoticeState>({
    visible: false,
    title: '',
    message: ''
  });

  // Login modal
  loginModal$ = this.loginModalSubject.asObservable();

  openLoginModal() {
    this.loginModalSubject.next(true);
  }

  closeLoginModal() {
    this.loginModalSubject.next(false);
  }

  // Signup modal
  signupModal$ = this.signupModalSubject.asObservable();

  openSignupModal() {
    this.signupModalSubject.next(true);
  }

  closeSignupModal() {
    this.signupModalSubject.next(false);
  }

  // Ask Results (RAG) dialog
  askResultsDialog$ = this.askResultsDialogSubject.asObservable();

  openAskResultsDialog(riskPercent: number | null = null, mode: 'voice' | 'gait' | 'multimodal' = 'voice') {
    this.askResultsDialogSubject.next({ visible: true, riskPercent, mode });
  }

  closeAskResultsDialog() {
    this.askResultsDialogSubject.next({
      ...this.askResultsDialogSubject.value,
      visible: false
    });
  }

  /** Global notice dialog (root level) */
  globalNotice$ = this.globalNoticeSubject.asObservable();

  openGlobalNotice(title: string, message: string) {
    this.globalNoticeSubject.next({ visible: true, title, message });
  }

  closeGlobalNotice() {
    this.globalNoticeSubject.next({ visible: false, title: '', message: '' });
  }

  // Close all modals
  closeAllModals() {
    this.loginModalSubject.next(false);
    this.signupModalSubject.next(false);
    this.askResultsDialogSubject.next({ ...this.askResultsDialogSubject.value, visible: false });
    this.closeGlobalNotice();
  }
}
