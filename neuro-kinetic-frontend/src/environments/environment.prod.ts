// Production API: must match Render Web Service name (default from render.yaml: fyp-backend).
// If Render assigns a different slug, replace the host below and redeploy Vercel.
export const environment = {
  production: true,
  apiUrl: 'https://fyp-backend.onrender.com/api',
  signalRUrl: 'https://fyp-backend.onrender.com/hubs/notifications',
  sessionExpiryMinutes: 15,
};


