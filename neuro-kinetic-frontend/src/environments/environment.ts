export const environment = {
  production: false,
  // Development API URL (matches backend API documentation)
  // Primary: HTTPS on port 7118 (as per API documentation)
  // apiUrl: 'https://localhost:7118/api',
  // signalRUrl: 'https://localhost:7118/hubs/notifications',
  
  // Alternative HTTP endpoints if HTTPS is not available:
  // Option 1: HTTP on port 5000 (currently active)
  apiUrl: 'http://localhost:5000/api',
  signalRUrl: 'http://localhost:5000/hubs/notifications',
  
  // Option 2: HTTP on port 5130
  // apiUrl: 'http://localhost:5130/api',
  // signalRUrl: 'http://localhost:5130/hubs/notifications',
};

