FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY config ./config
COPY tsconfig.json ./
ENV NODE_ENV=production NODE_NO_WARNINGS=1
VOLUME /app/data
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
