import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from './components/loader/loader.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { LoadingDirective } from './directives/loading.directive';
import { NsModalComponent } from './components/ns-modal/ns-modal.component';
import { NsStatCardComponent } from './components/ns-stat-card/ns-stat-card.component';
import { NsStatCardGridComponent } from './components/ns-stat-card-grid/ns-stat-card-grid.component';

@NgModule({
  declarations: [
    LoaderComponent,
    SkeletonComponent,
    LoadingDirective,
    NsModalComponent,
    NsStatCardComponent,
    NsStatCardGridComponent,
  ],
  exports: [
    LoaderComponent,
    SkeletonComponent,
    LoadingDirective,
    NsModalComponent,
    NsStatCardComponent,
    NsStatCardGridComponent,
  ],
  imports: [CommonModule],
})
export class SharedModule {}

