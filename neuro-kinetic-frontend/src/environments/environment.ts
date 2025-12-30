export const environment = {
  production: false,
  // Using HTTP for local development (HTTPS requires SSL certificate setup)
  apiUrl: 'http://localhost:5130/api',
  signalRUrl: 'http://localhost:5130/hubs/notifications',
  // Alternative HTTPS endpoint if your backend supports SSL
  // apiUrl: 'https://localhost:7118/api'
  // signalRUrl: 'https://localhost:7118/hubs/notifications'
};

