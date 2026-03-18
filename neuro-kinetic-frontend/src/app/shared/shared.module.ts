import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from './components/loader/loader.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { LoadingDirective } from './directives/loading.directive';

@NgModule({
  declarations: [LoaderComponent, SkeletonComponent, LoadingDirective],
  exports: [LoaderComponent, SkeletonComponent, LoadingDirective],
  imports: [CommonModule],
})
export class SharedModule {}

