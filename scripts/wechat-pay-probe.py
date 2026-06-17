#!/usr/bin/env python3
"""与 wander_meet wechat_pay_v3.py 相同签名逻辑，用于对比 Node probe。"""
from __future__ import annotations

import base64
import json
import os
import secrets
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
if not ENV_FILE.exists():
    ENV_FILE = ROOT / "server" / ".env"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def load_key(env: dict[str, str]) -> str:
    pem = (env.get("WECHAT_PRIVATE_KEY") or "").strip().replace("\\n", "\n")
    path = (env.get("WECHAT_PRIVATE_KEY_PATH") or "").strip()
    if not pem and path:
        pem = Path(path).read_text(encoding="utf-8")
    if not pem:
        raise SystemExit("未配置 WECHAT_PRIVATE_KEY 或 WECHAT_PRIVATE_KEY_PATH")
    return pem.strip()


def sign_message(message: str, pem: str) -> str:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    key = serialization.load_pem_private_key(pem.encode("utf-8"), password=None)
    sig = key.sign(message.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode("ascii")


def auth(method: str, url_path: str, body: str, env: dict[str, str], pem: str) -> str:
    mch_id = env["WECHAT_MCH_ID"].strip()
    serial = env["WECHAT_SERIAL_NO"].strip()
    ts = str(int(time.time()))
    nonce = secrets.token_hex(16)
    message = f"{method}\n{url_path}\n{ts}\n{nonce}\n{body}\n"
    signature = sign_message(message, pem)
    return (
        f'WECHATPAY2-SHA256-RSA2048 mchid="{mch_id}",'
        f'nonce_str="{nonce}",signature="{signature}",'
        f'timestamp="{ts}",serial_no="{serial}"'
    )


def request(method: str, url_path: str, body: str, env: dict[str, str], pem: str) -> tuple[int, str]:
    url = f"https://api.mch.weixin.qq.com{url_path}"
    headers = {
        "Authorization": auth(method, url_path, body, env, pem),
        "Accept": "application/json",
        "User-Agent": "wx-group-python-probe",
    }
    data = body.encode("utf-8") if body else None
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main() -> None:
    if not ENV_FILE.exists():
        raise SystemExit(f"未找到 {ENV_FILE}")

    env = load_env()
    pem = load_key(env)

    print("========== Python probe (wander_meet 同款) ==========")
    print("ENV", ENV_FILE)
    print("MCH_ID", env.get("WECHAT_MCH_ID"))
    print("SERIAL", env.get("WECHAT_SERIAL_NO"))
    print()

    status, text = request("GET", "/v3/certificates", "", env, pem)
    print("GET /v3/certificates", status, text[:400])
    if "SIGN_ERROR" in text:
        print("\n✗ Python 也 SIGN_ERROR → 100% 是商户平台证书/私钥/序列号问题，不是 Node 代码")
        print("  1. pay.weixin.qq.com → API安全 → 查看「商户API证书」当前序列号")
        print("  2. 重新下载 API 证书 zip，替换 apiclient_key.pem 并更新 WECHAT_SERIAL_NO")
        print("  3. 从小程序服务器复制 WECHAT_PAY_PRIVATE_KEY 或 apiclient_key.pem（md5 必须一致）")
        sys.exit(1)
    print("\n✓ Python GET 签名通过")


if __name__ == "__main__":
    main()
