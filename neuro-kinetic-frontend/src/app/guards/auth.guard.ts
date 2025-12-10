import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, UrlSegmentGroup, UrlSerializer } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router, private urlSerializer: UrlSerializer) {}

  canActivate(): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    const tree = this.router.parseUrl('/login');
    tree.queryParams = { redirect: 'true' };
    return tree;
  }
}

