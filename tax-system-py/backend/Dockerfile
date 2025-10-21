FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build 2>/dev/null || echo "Build step skipped"

EXPOSE 3001

CMD ["npm", "run", "dev"]
