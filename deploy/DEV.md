# 本地开发：Docker 基础设施 + 本地跑前后端

## 1. 启动 MySQL + Redis

```bash
cp .env.example .env

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
npm install
```

## 3. 初始化数据库

```bash
cd server
npx prisma migrate dev --name init
npm run prisma:seed
cd ..
```

## 4. 启动开发服务

```bash
# 终端 1 - API
npm run dev:server

# 终端 2 - C 端
npm run dev:web

# 终端 3 - 管理后台
npm run dev:admin
```

| 服务 | 地址 |
|------|------|
| C 端 | http://localhost:5173 |
| 管理后台 | http://localhost:5174/admin/ |
| API | http://localhost:3000/api/v1 |
| 健康检查 | http://localhost:3000/api/v1/health |

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
