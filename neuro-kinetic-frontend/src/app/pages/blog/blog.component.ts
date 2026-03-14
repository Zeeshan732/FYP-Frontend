import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ArticleAuthor } from '../../components/blog/article-card/article-card.component';

export interface ArticleCardData {
  thumbBg: string;
  thumbLabel: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  author: ArticleAuthor | null;
  date: string;
  metaOverride?: string;
  iconType?: 'voice' | 'gait' | 'tap' | 'research' | 'case-study';
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent {
  searchQuery = '';

  newsArticles: ArticleCardData[] = [
    {
      thumbBg: '#0F2340',
      thumbLabel: 'PLATFORM NEWS',
      tag: 'Platform update',
      tagColor: '#2E86DE',
      title: 'NeuroSync v2.0 launches with real-time voice tremor detection',
      desc: 'The new release adds live waveform feedback during recording and cuts analysis time to under 3 seconds.',
      author: { initials: 'AR', name: 'Dr. Ayesha Raza', color: '#2E86DE', colorBg: 'rgba(46,134,222,0.2)' },
      date: 'Feb 28',
      iconType: 'voice'
    },
    {
      thumbBg: '#1A1640',
      thumbLabel: 'RESEARCH',
      tag: 'Research',
      tagColor: '#7F77DD',
      title: 'Gait asymmetry as an early Parkinson\'s marker: new findings',
      desc: 'Our ML model identifies stride irregularities up to 14 months before clinical motor symptoms appear.',
      author: { initials: 'UA', name: 'Umair Azam', color: '#7F77DD', colorBg: 'rgba(127,119,221,0.2)' },
      date: 'Feb 14',
      iconType: 'gait'
    },
    {
      thumbBg: '#04342C',
      thumbLabel: 'PRODUCT',
      tag: 'Product',
      tagColor: '#1D9E75',
      title: 'How NeuroSync\'s tap test evolved from prototype to clinical tool',
      desc: 'A behind-the-scenes look at how we turned a 10-second interaction into a medically validated bradykinesia assessment.',
      author: { initials: 'ZN', name: 'Zeeshan Nawaz', color: '#1D9E75', colorBg: 'rgba(29,158,117,0.2)' },
      date: 'Jan 30',
      iconType: 'tap'
    }
  ];

  researchArticles: ArticleCardData[] = [
    {
      thumbBg: '#2A1A00',
      thumbLabel: '',
      tag: 'Accuracy',
      tagColor: '#F0A500',
      title: 'Benchmarking NeuroSync against UPDRS clinical scoring',
      desc: 'Our 127-patient cohort study compares AI classification confidence with neurologist UPDRS ratings.',
      author: { initials: 'AR', name: 'Dr. Ayesha Raza', color: '#F0A500', colorBg: 'rgba(240,165,0,0.2)' },
      date: 'Jan 12',
      iconType: 'research'
    },
    {
      thumbBg: '#0F2340',
      thumbLabel: '',
      tag: 'Data science',
      tagColor: '#2E86DE',
      title: 'Why voice tremor frequency outperforms pitch as a biomarker',
      desc: 'Feature importance analysis across 3,200 voice samples reveals tremor rate as the strongest single predictor.',
      author: { initials: 'UA', name: 'Umair Azam', color: '#2E86DE', colorBg: 'rgba(46,134,222,0.2)' },
      date: 'Dec 19',
      iconType: 'voice'
    },
    {
      thumbBg: '#04342C',
      thumbLabel: '',
      tag: 'Clinical timing',
      tagColor: '#1D9E75',
      title: 'How early can NeuroSync detect pre-motor Parkinson\'s signs?',
      desc: 'Longitudinal analysis of 43 positive cases shows consistent biomarker signals up to 18 months pre-diagnosis.',
      author: { initials: 'AR', name: 'Dr. Ayesha Raza', color: '#1D9E75', colorBg: 'rgba(29,158,117,0.2)' },
      date: 'Nov 28',
      iconType: 'research'
    }
  ];

  caseStudyArticles: ArticleCardData[] = [
    {
      thumbBg: '#0D1B2E',
      thumbLabel: '',
      tag: 'Case study',
      tagColor: '#2E86DE',
      title: 'Patient 047: Detecting onset 16 months before clinical referral',
      desc: 'How consistent tap rhythm degradation over 6 assessments flagged early-stage bradykinesia in a 58-year-old.',
      author: null,
      date: '',
      metaOverride: 'Anonymised · Mar 2026',
      iconType: 'case-study'
    },
    {
      thumbBg: '#1A1640',
      thumbLabel: '',
      tag: 'Case study',
      tagColor: '#7F77DD',
      title: 'Gait asymmetry index as primary indicator: a 12-month follow-up',
      desc: 'Stride analysis data from a rural clinic showing how video-based gait scoring matched in-person neurologist assessment.',
      author: null,
      date: '',
      metaOverride: 'Anonymised · Feb 2026',
      iconType: 'case-study'
    },
    {
      thumbBg: '#04342C',
      thumbLabel: '',
      tag: 'Case study',
      tagColor: '#1D9E75',
      title: 'From uncertain to confirmed: how combined scoring resolved a borderline case',
      desc: 'A patient with inconclusive single-signal scores reached 84% confidence when all three biomarkers were combined.',
      author: null,
      date: '',
      metaOverride: 'Anonymised · Jan 2026',
      iconType: 'case-study'
    }
  ];

  constructor(private router: Router) {}

  goToNeuroSync(): void {
    this.router.navigate(['/landing']);
  }

  tryFree(): void {
    this.router.navigate(['/patient-test']);
  }
}
