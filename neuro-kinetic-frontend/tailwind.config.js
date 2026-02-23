/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-primary': {
          DEFAULT: '#38856e',
          hover: '#3f9478',
          foreground: '#ffffff',
        },
        'app-surface': {
          DEFAULT: '#ffffff',
          muted: '#f8f8f8',
        },
        'app-text': {
          primary: '#333333',
          muted: '#888888',
        },
        'app-secondary-border': '#333333',
        'app-border': {
          DEFAULT: '#e5e7eb',
          strong: '#333333',
        },
      },
      fontSize: {
        'app-body': ['1rem', { lineHeight: '1.5' }],
        'app-lead': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],
        'app-caption': ['0.9375rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        'app': '8px',
        'app-lg': '12px',
      },
      boxShadow: {
        'app': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.07)',
      },
    },
  },
  plugins: [],
};
