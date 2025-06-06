#!/usr/bin/env node

// Simple production starter for deployment
process.env.NODE_ENV = "production";

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Import and run the server using dynamic import
import('tsx/esm').then(async () => {
  const { spawn } = await import('child_process');
  
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });

}).catch((error) => {
  console.error('Failed to import tsx:', error);
  process.exit(1);
});