FROM node:26-alpine

WORKDIR /usr/src/bridge

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENTRYPOINT ["node", "bridge.js"]
CMD ["--config", "/config/config.json"]
