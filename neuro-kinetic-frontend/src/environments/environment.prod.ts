// Production: set `apiBaseUrl` to your deployed API origin (scheme + host, no trailing slash, no /api path).
const apiBaseUrl = 'https://api.example.com';

export const environment = {
  production: true,
  apiUrl: `${apiBaseUrl}/api`,
  signalRUrl: `${apiBaseUrl}/hubs/notifications`,
  sessionExpiryMinutes: 15,
};
