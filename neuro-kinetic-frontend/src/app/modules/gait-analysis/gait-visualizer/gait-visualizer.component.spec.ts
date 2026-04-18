import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ActivatedRoute } from '@angular/router';
import { GaitVisualizerComponent } from './gait-visualizer.component';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

describe('GaitVisualizerComponent', () => {
  let component: GaitVisualizerComponent;
  let fixture: ComponentFixture<GaitVisualizerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule],
      declarations: [GaitVisualizerComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            processAnalysis: () => of({}),
            createUserTestRecord: () => of({ id: 1 }),
            linkAnalysisToTestRecord: () => of(undefined)
          }
        },
        {
          provide: AuthService,
          useValue: { currentUser$: of(null) }
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        }
      ]
    });
    fixture = TestBed.createComponent(GaitVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
