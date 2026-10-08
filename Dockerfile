FROM node:22-bookworm-slim

# ffmpeg for the audio pipeline
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY tsconfig.base.json ./
COPY server ./server
COPY web ./web
RUN npm install --no-audit --no-fund && npm run build

ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "server/dist/index.js"]
