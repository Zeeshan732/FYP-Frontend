/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy:     '#0F3D6E',
        blue:     { DEFAULT: '#2E86DE', light: 'rgba(46, 134, 222, 0.12)', hover: '#1A6FA8' },
        violet:   { DEFAULT: '#7F77DD', light: 'rgba(127, 119, 221, 0.12)' },
        purple:   '#7F77DD',
        healthy:  { DEFAULT: '#1D9E75', bg: 'rgba(29, 158, 117, 0.15)' },
        warning:  { DEFAULT: '#F0A500', bg: 'rgba(240, 165, 0, 0.15)' },
        critical: { DEFAULT: '#E05252', bg: 'rgba(224, 82, 82, 0.15)' },
        voice:    { DEFAULT: '#2E86DE', bg: 'rgba(46, 134, 222, 0.12)' },
        gait:     { DEFAULT: '#7F77DD', bg: 'rgba(127, 119, 221, 0.12)' },
        tap:      { DEFAULT: '#1D9E75', bg: 'rgba(29, 158, 117, 0.12)' },
        ink:      '#E8EBF0',
        muted:    '#8B95A6',
        surface:  '#112240',
        pagebg:   '#0A1628',
        border:   'rgba(255, 255, 255, 0.08)',
        /* Legacy app-* for existing class names */
        'app-primary': {
          DEFAULT: '#2E86DE',
          hover: '#1A6FA8',
          foreground: '#ffffff',
        },
        'app-surface': {
          DEFAULT: '#112240',
          muted: 'rgba(46, 134, 222, 0.12)',
        },
        'app-text': {
          primary: '#E8EBF0',
          muted: '#8B95A6',
        },
        'app-bg': '#0A1628',
        'app-border': {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.15)',
        },
      },
      fontFamily: {
        base: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'app-body': ['1rem', { lineHeight: '1.6' }],
        'app-lead': ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
        'app-caption': ['0.9375rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        'app': '8px',
        'app-lg': '10px',
        'card': '10px',
        'badge': '20px',
      },
      boxShadow: {
        'app': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
