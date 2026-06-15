const fs = require('fs');
const path = require('path');

const root = __dirname;

/** 读取 .env 注入 PM2（Nest 启动前也会再 load 一次） */
function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const envFile = fs.existsSync(path.join(root, '.env'))
  ? path.join(root, '.env')
  : path.join(root, 'server/.env');
const envFromFile = loadEnvFile(envFile);

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
        ...envFromFile,
      },
    },
    {
      name: 'wx-web',
      cwd: root,
      script: path.join(root, 'scripts/preview-web.sh'),
      interpreter: 'bash',
      instances: 1,
      autorestart: true,
      error_file: path.join(root, 'logs/web-error.log'),
      out_file: path.join(root, 'logs/web-out.log'),
    },
  ],
};
