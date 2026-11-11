FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev
COPY backend ./backend
COPY cursor ./cursor
COPY migrations ./migrations
COPY backend/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /data \
  && chown node:node /data
ENV NODE_ENV=production
ENV PORT=4871
ENV DATA_DIR=/data
ENV APP_TIME_ZONE=Africa/Harare
EXPOSE 4871
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "backend/server.js"]
