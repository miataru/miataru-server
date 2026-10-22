FROM node:26-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
COPY package.json package-lock.json /usr/src/app/
RUN npm ci

EXPOSE 8090
CMD [ "npm", "start" ]
