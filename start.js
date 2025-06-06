// Simple production starter that handles environment setup
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Import and start the server
import('./server/index.ts').then(() => {
  console.log('Server started successfully');
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});