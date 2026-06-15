const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'wx-api',
      cwd: path.join(root, 'server'),
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: path.join(root, 'logs/api-error.log'),
      out_file: path.join(root, 'logs/api-out.log'),
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'wx-web',
      cwd: path.join(root, 'apps/web'),
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 5173',
      instances: 1,
      autorestart: true,
      error_file: path.join(root, 'logs/web-error.log'),
      out_file: path.join(root, 'logs/web-out.log'),
    },
  ],
};
