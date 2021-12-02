FROM node:17

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

ENV CI=true
ENV DOCSEARCH_ENABLED=true
ENV DOCSEARCH_ENGINE=lunr

ENTRYPOINT npm run docker-build