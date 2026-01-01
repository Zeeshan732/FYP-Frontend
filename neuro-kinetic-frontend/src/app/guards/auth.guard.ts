import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, UrlSegmentGroup, UrlSerializer } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router, private urlSerializer: UrlSerializer) {}

  canActivate(): boolean | UrlTree {
    const isAuth = this.authService.isAuthenticated();
    console.log('AuthGuard check - isAuthenticated:', isAuth);
    
    if (isAuth) {
      return true;
    }

    console.log('AuthGuard - redirecting to login');
    const tree = this.router.parseUrl('/login');
    tree.queryParams = { redirect: 'true' };
    return tree;
  }
}

