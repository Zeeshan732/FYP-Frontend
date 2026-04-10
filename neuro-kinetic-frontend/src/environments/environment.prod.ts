// Production: deployed App Service origin (scheme + host, no trailing slash, no /api path).
const apiBaseUrl =
  'https://neurosync-api-exgrebaqh6ghczcg.canadacentral-01.azurewebsites.net';

export const environment = {
  production: true,
  apiUrl: `${apiBaseUrl}/api`,
  signalRUrl: `${apiBaseUrl}/hubs/notifications`,
  sessionExpiryMinutes: 15,
};
