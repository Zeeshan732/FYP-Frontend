import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GaitAnalysisRoutingModule } from './gait-analysis-routing.module';
import { GaitVisualizerComponent } from './gait-visualizer/gait-visualizer.component';


@NgModule({
  declarations: [
    GaitVisualizerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    GaitAnalysisRoutingModule
  ]
})
export class GaitAnalysisModule { }
