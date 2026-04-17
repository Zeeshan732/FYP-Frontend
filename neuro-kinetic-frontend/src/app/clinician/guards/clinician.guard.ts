import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ClinicianGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const user = this.authService.getCurrentUser();
    const roleRaw = user?.role ?? '';
    const role = String(roleRaw).toLowerCase();
    const isClinician = role === 'clinician' || role === 'medicalprofessional';

    if (!user || !isClinician) {
      this.router.navigate(['/dashboard']);
      return false;
    }

    if (!this.authService.isSessionUserAllowed(user)) {
      const qp =
        user.status === 'Rejected'
          ? { reason: 'clinician_rejected' }
          : { reason: 'clinician_pending' };
      this.authService.clearAuthAndGoToLogin(qp);
      return false;
    }

    return true;
  }

  canActivateChild(): boolean {
    return this.canActivate();
  }
}
