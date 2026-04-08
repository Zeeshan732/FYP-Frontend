// Production API — host must match Render Dashboard → Web Service → URL (exact hostname).
// Example: https://fyp-backend-fw4z.onrender.com (Render adds a unique suffix; fyp-backend.onrender.com alone may not exist).
// After changing this file, redeploy the Vercel project (production build).
export const environment = {
  production: true,
  apiUrl: 'https://fyp-backend-fw4z.onrender.com/api',
  signalRUrl: 'https://fyp-backend-fw4z.onrender.com/hubs/notifications',
  sessionExpiryMinutes: 15,
};

