// Production: deployed App Service origin (scheme + host, no trailing slash, no /api path).
const apiBaseUrl =
  'https://neurosync-api-exgrebagh6ghczcg.canadacentral.azurewebsites.net';

export const environment = {
  production: true,
  apiUrl: `${apiBaseUrl}/api`,
  signalRUrl: `${apiBaseUrl}/hubs/notifications`,
  sessionExpiryMinutes: 15,
};
