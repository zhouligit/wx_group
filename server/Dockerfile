FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace=@wx-group/server

COPY server ./server
WORKDIR /app/server
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
