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
    const roleRaw = this.authService.getCurrentUser()?.role ?? '';
    const role = String(roleRaw).toLowerCase();
    if (role === 'clinician' || role === 'medicalprofessional') {
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }

  canActivateChild(): boolean {
    return this.canActivate();
  }
}
