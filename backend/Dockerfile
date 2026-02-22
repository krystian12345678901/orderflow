FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p data uploads

EXPOSE 5000

CMD ["node", "server.js"]
