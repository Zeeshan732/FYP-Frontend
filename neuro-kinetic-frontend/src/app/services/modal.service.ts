import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AskResultsDialogState {
  visible: boolean;
  riskPercent: number | null;
  mode: 'voice' | 'gait' | 'multimodal';
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

  // Close all modals
  closeAllModals() {
    this.loginModalSubject.next(false);
    this.signupModalSubject.next(false);
    this.askResultsDialogSubject.next({ ...this.askResultsDialogSubject.value, visible: false });
  }
}
