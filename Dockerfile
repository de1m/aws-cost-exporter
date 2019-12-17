FROM node:13.3.0-alpine3.10

COPY ./ /node

WORKDIR /node

RUN npm i -g

CMD ["node", "/node/app.js"]
