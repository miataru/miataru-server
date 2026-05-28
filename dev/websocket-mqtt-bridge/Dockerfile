FROM node:20-alpine

WORKDIR /usr/src/bridge

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENTRYPOINT ["node", "bridge.js"]
CMD ["--config", "/config/config.json"]
