# 本地开发：Docker 基础设施 + 本地跑前后端

## 1. 启动 MySQL + Redis

```bash
# ⚠️ 必须先创建 .env（否则报 DATABASE_URL not found）
cp .env.example .env

# 按服务器实际情况修改 DATABASE_URL，例如：
# DATABASE_URL=mysql://wxgroup:你的密码@127.0.0.1:3306/wx_group

# 推荐：自动选择 compose 工具
npm run docker:up
```

或手动执行（按你的环境选一种）：

```bash
# Docker Compose V2（Docker Desktop）
docker compose up -d mysql redis

# docker-compose V1（Podman 用户常用，推荐）
docker-compose up -d mysql redis

# podman-compose
podman-compose up -d mysql redis
```

### Podman 报错 `unknown shorthand flag: 'd' in -d`

说明当前 `docker` 实际是 Podman 模拟，且不支持 `docker compose` 子命令。请改用：

```bash
docker-compose up -d mysql redis
```

若未安装：

```bash
brew install docker-compose
# 或
brew install podman-compose
```

可选：创建 `/etc/containers/nodocker` 可关闭 Podman 的 docker 模拟提示（需 sudo）。

### Linux `apt` 报错 `Unmet dependencies` / `node-yallist`

**不要用 `apt install docker-compose`**，Debian/Ubuntu 源里的包常依赖 `nodejs` 等，容易和系统已有 Node 冲突。

**方案 A：用 pip 安装（推荐，不碰 apt 的 node 包）**

```bash
pip install docker-compose
# 或 Podman 环境
pip install podman-compose

docker-compose up -d mysql redis
```

**方案 B：下载独立二进制（无需 apt）**

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose up -d mysql redis
```

**方案 C：修复 apt 后再装其他包（若系统 apt 已损坏）**

```bash
sudo apt --fix-broken install
sudo apt update
sudo apt upgrade
```

**方案 D：不用 Docker，直接装 MySQL + Redis（最省事）**

```bash
sudo apt update
sudo apt install -y mysql-server redis-server

# 创建数据库与用户（按 .env.example 配置）
sudo mysql -e "CREATE DATABASE wx_group CHARACTER SET utf8mb4;
  CREATE USER 'wxgroup'@'localhost' IDENTIFIED BY 'wxgroup123';
  GRANT ALL ON wx_group.* TO 'wxgroup'@'localhost';
  FLUSH PRIVILEGES;"

# .env 中 DATABASE_URL 改为：
# mysql://wxgroup:wxgroup123@localhost:3306/wx_group
# REDIS_URL=redis://localhost:6379
```

然后跳过 `docker:up`，直接 `npm install` → 初始化数据库 → 启动服务。

**说明：** 本项目 Node 依赖请用 **nvm / fnm / 官方 Node 安装包**，不要用 `apt install nodejs npm` 与 Docker 混装。

## 2. 安装依赖

```bash
cd /opt/wx_group   # 必须在项目根目录
npm install
```

### `npm error ERR_INVALID_URL`

多为 **npm 全局配置或环境变量里的 URL 格式错误**（常见：registry 少了 `https://`，或 proxy 为空/乱码）。

在服务器上依次执行：

```bash
# 1. 查看当前配置
npm -v
node -v
npm config list

# 2. 清理错误 proxy（最常见原因）
npm config delete proxy
npm config delete https-proxy
npm config delete http-proxy
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY

# 3. 设置合法 registry（必须带 https://）
npm config set registry https://registry.npmmirror.com

# 4. 若 root 的 ~/.npmrc 有乱码，可备份后重写
cat ~/.npmrc
# 如有 registry=xxx 且没有 https://，改成：
# registry=https://registry.npmmirror.com

# 5. 重新安装
cd /opt/wx_group
rm -rf node_modules apps/web/node_modules apps/admin/node_modules server/node_modules
npm install
```

**要求：** Node ≥ 20，npm ≥ 9（`lockfileVersion: 3`）。npm 过旧请升级：

```bash
npm install -g npm@10
# 或使用 nvm 安装 Node 20+
```

若仍失败，可删除 lock 后重装（版本可能略有浮动）：

```bash
rm -f package-lock.json
npm install
```

项目根目录已包含 `.npmrc`，`git pull` 后会自动使用合法镜像地址。

## 3. 初始化数据库

`.env` 可放在 **项目根目录** `/opt/wx_group/.env` 或 **`server/.env`**。

```bash
# DATABASE_URL 示例（远程库）：
# DATABASE_URL=mysql://wx_group:密码@106.13.108.88:3306/wx_group_db

cd /opt/wx_group/server
npm run prisma:generate
npm run prisma:push      # 推荐：远程库用户通常无 CREATE DATABASE 权限
npm run prisma:seed
cd ..
```

### 报错 P3014 / shadow database

`prisma migrate dev` 需要 MySQL 用户有 **CREATE DATABASE** 权限（用于 shadow 库）。  
云数据库 / 共享 MySQL 的 `wx_group` 用户一般**只有单库权限**，请改用：

```bash
npm run prisma:push    # 直接同步表结构，不需要 shadow 库
```

若你有 DBA 权限，也可给用户授权后再 migrate：

```sql
GRANT CREATE, DROP, ALTER, INDEX ON *.* TO 'wx_group'@'%';
-- 或仅允许在同一实例创建 shadow 库
```

本地开发机（有完整权限）才适合用 `npm run prisma:migrate`。

生产部署（已有 migrations 目录时）用：

```bash
npm run prisma:deploy   # 不需要 shadow 库
```

## 4. 启动开发服务

**注意：** `dev:server` / `dev:web` / `dev:admin` 定义在**项目根目录** `package.json`。请先：

```bash
cd /opt/wx_group   # 或你的项目根路径
npm install        # 必须在根目录安装（monorepo workspaces）
```

再启动（在**根目录**执行）：

```bash
# 终端 1 - API
npm run dev:server

# 终端 2 - C 端
npm run dev:web

# 终端 3 - 管理后台
npm run dev:admin
```

若你已在 `server/` 目录下，可直接：

```bash
cd server
npm run start:dev
# 或（已添加别名）
npm run dev:server
```

生产环境启动 API：

```bash
cd server
npm run build
npm run start:prod
```

## 5. 后台启动（推荐服务器部署）

前后端一键后台运行（自动 build + PM2；无 PM2 时用 nohup）：

```bash
cd /opt/wx_group

# 推荐：拉代码 + 装依赖 + 构建 + 重启（npm ci 不会改 lock 文件）
npm run redeploy

# 或分步：
npm run pull:deploy   # 安全 git pull（丢弃服务器上 npm 改动的 lock）
npm ci                # 勿用 npm install，避免再次改动 package-lock.json
npm run start:bg
```

**为何不用 `git pull` + `npm install`？**  
服务器上 `npm install` 常会改写 `package-lock.json`（甚至 workspace 的 `package.json`），下次 `git pull` 就会因本地有改动而失败。生产机应以仓库版本为准，用 `npm run pull:deploy` 和 `npm ci`。

常用命令：

```bash
npm run status:bg   # 查看状态
npm run logs:bg     # 查看日志
npm run stop:bg     # 停止
```

跳过构建（已 build 过）：

```bash
SKIP_BUILD=1 npm run start:bg
```

验证：

```bash
curl http://127.0.0.1:3000/api/v1/health
curl -I http://127.0.0.1:5173
```

外网访问需在云安全组放行 **3000**（API）、**5173**（Web）。

### 连接被拒绝 / 启动失败

```bash
npm run status:bg          # 看 wx-api、wx-web 是否 online
npm run logs:bg            # 看错误日志
tail -50 logs/api-error.log
tail -50 logs/web-error.log
```

常见原因：

| 现象 | 处理 |
|------|------|
| `dist/main.js 不存在` | `npm run build:server` 后重试 |
| `Can't reach database server` | 检查 `.env` 里 `DATABASE_URL` 能否连上 MySQL |
| PM2 显示 errored | `npm run stop:bg && npm run start:bg` |

开机自启（PM2）：

```bash
npx pm2 startup
npx pm2 save
```

## 6. 域名访问（jiaoyou.yikuaikaixin.cn）

域名 DNS 已指向服务器 IP 后，用 **Nginx 反代 80/443**，浏览器只访问域名，不再直接暴露 5173/3000。

### 6.1 修改 `.env`（项目根目录 `/opt/wx_group/.env`）

```env
API_PORT=3000
CORS_ORIGIN=https://jiaoyou.yikuaikaixin.cn
WEB_BASE_URL=https://jiaoyou.yikuaikaixin.cn
WECHAT_NOTIFY_URL=https://jiaoyou.yikuaikaixin.cn/api/v1/payments/wechat/notify
```

若暂未上 HTTPS，可先用 `http://jiaoyou.yikuaikaixin.cn`，上线证书后再改成 `https://`。

改完后重启 API：

```bash
cd /opt/wx_group
npm run stop:bg
npm run start:bg
```

### 6.2 安装并配置 Nginx

```bash
sudo apt update
sudo apt install -y nginx

cd /opt/wx_group
git pull   # 拉取 deploy/nginx.jiaoyou.conf

sudo cp deploy/nginx.jiaoyou.conf /etc/nginx/sites-available/jiaoyou
sudo ln -sf /etc/nginx/sites-available/jiaoyou /etc/nginx/sites-enabled/jiaoyou

# 如存在 default 站点且冲突，可禁用：
# sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

云安全组放行 **80**、**443**（5173、3000 可不对公网开放，仅本机 Nginx 访问）。

### 6.3 申请 HTTPS（推荐）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jiaoyou.yikuaikaixin.cn
```

按提示选择「重定向 HTTP 到 HTTPS」。证书自动续期：

```bash
sudo certbot renew --dry-run
```

申请成功后，把 `.env` 里相关 URL 全部改为 `https://`，再 `npm run stop:bg && npm run start:bg`。

### 6.4 验证

```bash
curl -I http://jiaoyou.yikuaikaixin.cn
curl http://jiaoyou.yikuaikaixin.cn/api/v1/health
```

浏览器打开：**https://jiaoyou.yikuaikaixin.cn**

### 6.5 架构示意

```
用户浏览器
    ↓ 80/443
Nginx (jiaoyou.yikuaikaixin.cn)
    ├─ /        → 127.0.0.1:5173（C 端，或静态 dist）
    └─ /api/    → 127.0.0.1:3000（NestJS API）
```

前端请求已是相对路径 `/api/v1`，无需改前端代码。

| 服务 | 地址 |
|------|------|
| C 端 | http://localhost:5173 |
| 管理后台 | http://localhost:5174/admin/ |
| API | http://localhost:3000/api/v1 |
| 健康检查 | http://localhost:3000/api/v1/health |

## 7. 微信支付（测试 0.01 元）

### 7.1 `.env` 配置

```env
PAYMENT_TEST_MODE=true
PAYMENT_TEST_AMOUNT=0.01
PAYMENT_USE_MOCK=false

WECHAT_APP_ID=服务号AppID
WECHAT_APP_SECRET=服务号Secret
WECHAT_MCH_ID=商户号
WECHAT_API_V3_KEY=APIv3密钥
WECHAT_SERIAL_NO=商户API证书序列号
WECHAT_PRIVATE_KEY_PATH=/opt/wx_group/certs/apiclient_key.pem
WECHAT_NOTIFY_URL=https://jiaoyou.yikuaikaixin.cn/api/v1/payments/wechat/notify
WEB_BASE_URL=https://jiaoyou.yikuaikaixin.cn
```

本地无商户号时设 `PAYMENT_USE_MOCK=true` 可走 mock。

### 7.2 微信公众平台

| 配置项 | 值 |
|--------|-----|
| 网页授权域名 | `jiaoyou.yikuaikaixin.cn` |
| JS 安全域名 | `jiaoyou.yikuaikaixin.cn` |
| 支付授权目录 | `https://jiaoyou.yikuaikaixin.cn/` |
| OAuth 回调 | `https://jiaoyou.yikuaikaixin.cn/api/v1/auth/wechat/callback` |
| 支付回调 | `https://jiaoyou.yikuaikaixin.cn/api/v1/payments/wechat/notify` |

### 7.3 流程

- **微信内**：OAuth 绑定 openid → JSAPI 支付 ¥0.01
- **PC**：H5 支付（需开通 H5 域名）

```bash
npm run stop:bg && npm run start:bg
```

## 5. 生产模式（Docker 全栈）

先构建前端：

```bash
npm run build
docker compose up -d --build
```

访问：http://localhost:8080

## 开发账号

| 角色 | 账号 | 密码/验证码 |
|------|------|------------|
| 管理后台 | admin | admin123 |
| C 端登录 | 任意手机号 | 123456（SMS_MOCK=true） |
