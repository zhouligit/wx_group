#!/usr/bin/env node
/**
 * 探测微信支付 v3 签名（SIGN_ERROR 时用）
 * 用法: node scripts/wechat-pay-probe.mjs
 */
import { createPrivateKey, randomBytes, sign } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import https from 'https';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = [resolve(ROOT, '.env'), resolve(ROOT, 'server/.env')].find(existsSync);

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function loadKey(env) {
  let pem = (env.WECHAT_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n');
  if (!pem && env.WECHAT_PRIVATE_KEY_PATH) {
    pem = readFileSync(env.WECHAT_PRIVATE_KEY_PATH.trim(), 'utf8').trim();
  }
  if (!pem) throw new Error('未配置 WECHAT_PRIVATE_KEY 或 WECHAT_PRIVATE_KEY_PATH');
  return pem;
}

function buildAuth(method, urlPath, body, env, keyPem) {
  const mchId = env.WECHAT_MCH_ID.trim();
  const serial = env.WECHAT_SERIAL_NO.trim();
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${ts}\n${nonce}\n${body}\n`;
  const key = createPrivateKey(keyPem);
  const sig = sign('RSA-SHA256', Buffer.from(message, 'utf8'), key).toString('base64');
  return (
    `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",` +
    `nonce_str="${nonce}",signature="${sig}",` +
    `timestamp="${ts}",serial_no="${serial}"`
  );
}

function request(method, urlPath, bodyStr, env, keyPem) {
  return new Promise((resolve, reject) => {
    const auth = buildAuth(method, urlPath, bodyStr, env, keyPem);
    const bodyBuf = bodyStr ? Buffer.from(bodyStr, 'utf8') : null;
    const req = https.request(
      {
        hostname: 'api.mch.weixin.qq.com',
        path: urlPath,
        method,
        headers: {
          Accept: 'application/json',
          Authorization: auth,
          'User-Agent': 'wx-group-probe',
          ...(bodyBuf
            ? {
                'Content-Type': 'application/json',
                'Content-Length': bodyBuf.length,
              }
            : {}),
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, text }));
      },
    );
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

if (!ENV_FILE) {
  console.error('未找到 .env');
  process.exit(1);
}

const env = loadEnv(ENV_FILE);
const keyPem = loadKey(env);

console.log('========== 配置 ==========');
console.log('MCH_ID', env.WECHAT_MCH_ID);
console.log('APP_ID', env.WECHAT_APP_ID);
console.log('SERIAL', env.WECHAT_SERIAL_NO);
console.log('KEY', env.WECHAT_PRIVATE_KEY_PATH || '(inline)');
console.log('');

console.log('========== 1. GET /v3/certificates（仅测签名，无 body）==========');
const r1 = await request('GET', '/v3/certificates', '', env, keyPem);
console.log('HTTP', r1.status, r1.text.slice(0, 300));
if (r1.text.includes('SIGN_ERROR')) {
  console.log('\n✗ 连 GET 都 SIGN_ERROR → 商户号/序列号/私钥 与微信商户平台不一致');
  console.log('  请登录 pay.weixin.qq.com → API安全 → 确认「商户API证书」序列号与 .env 完全一致');
  console.log('  并与小程序服务器对比 apiclient_key.pem 的 md5');
  process.exit(1);
}
console.log('✓ GET 签名通过\n');

console.log('========== 2. POST jsapi（模拟下单，openid 占位）==========');
const jsapiBody = JSON.stringify({
  appid: env.WECHAT_APP_ID.trim(),
  mchid: env.WECHAT_MCH_ID.trim(),
  description: 'probe-test',
  out_trade_no: `PROBE${Date.now()}`,
  notify_url: (env.WECHAT_NOTIFY_URL || 'https://jiaoyou.yikuaikaixin.cn/api/v1/payments/wechat/notify').trim(),
  amount: { total: 1, currency: 'CNY' },
  payer: { openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o' },
});
const r2 = await request('POST', '/v3/pay/transactions/jsapi', jsapiBody, env, keyPem);
console.log('HTTP', r2.status, r2.text.slice(0, 400));
if (r2.text.includes('SIGN_ERROR')) {
  console.log('\n✗ POST jsapi SIGN_ERROR（GET 已通过，少见）');
} else if (r2.text.includes('openid') || r2.text.includes('APPID')) {
  console.log('\n✓ POST 签名通过（openid/appid 报错属正常，说明签名 OK）');
} else {
  console.log('\n响应见上');
}
