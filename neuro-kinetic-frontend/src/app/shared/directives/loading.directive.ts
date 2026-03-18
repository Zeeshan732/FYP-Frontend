import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appLoading]'
})
export class LoadingDirective {
  @Input('appLoading') isLoading = false;

  @HostBinding('class.ns-loading') get loadingClass(): boolean {
    return this.isLoading;
  }

  @HostBinding('attr.aria-busy') get ariaBusy(): string {
    return this.isLoading ? 'true' : 'false';
  }
}

