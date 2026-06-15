import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/** 按优先级查找 .env（支持从根目录或 server 目录启动） */
export function resolveEnvFilePaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, '.env'),
    resolve(cwd, '../.env'),
    resolve(cwd, 'server/.env'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../../../.env'),
  ];
  return [...new Set(candidates.filter((p) => existsSync(p)))];
}

export function loadEnvFiles(): void {
  const paths = resolveEnvFilePaths();
  if (paths.length === 0) {
    console.warn(
      '[env] 未找到 .env 文件。请执行: cp .env.example .env 并按服务器 MySQL 配置修改 DATABASE_URL',
    );
    return;
  }
  for (const p of paths) {
    config({ path: p });
  }
}
