import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface TeamMember {
  initials: string;
  name: string;
  role: string;
  bio: string;
  accentColor: string;
  accentBg: string;
  tagLabel: string;
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  team: TeamMember[] = [
    // {
    //   initials: 'AR',
    //   name: 'Dr. Ayesha Raza',
    //   role: 'Neurologist & Co-founder',
    //   bio: '15+ years in movement disorders. Leads clinical validation and assessment protocol design.',
    //   accentColor: '#2E86DE',
    //   accentBg: 'rgba(46,134,222,0.15)',
    //   tagLabel: 'Clinical Lead'
    // },
    {
      initials: 'UA',
      name: 'Umair Azam',
      role: 'ML Engineer & Co-founder',
      bio: 'Specialises in time-series ML models. Built the voice, gait, and finger-tapping classification pipelines.',
      accentColor: '#7F77DD',
      accentBg: 'rgba(127,119,221,0.15)',
      tagLabel: 'AI & ML'
    },
    {
      initials: 'ZN',
      name: 'Zeeshan Nawaz',
      role: 'Product & UX Lead',
      bio: 'Designs for clinicians and patients alike. Focused on making complex AI output intuitive and accessible.',
      accentColor: '#1D9E75',
      accentBg: 'rgba(29,158,117,0.15)',
      tagLabel: 'Product & Design'
    }
  ];

  constructor(private router: Router) {}

  startAssessment(): void {
    this.router.navigate(['/patient-test']);
  }

  contactTeam(): void {
    this.router.navigate(['/contact']);
  }
}
