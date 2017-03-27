FROM node:alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

EXPOSE 8090
CMD [ "npm", "start" ]
