FROM node:18-alpine

WORKDIR /app

# Install netcat for healthcheck
RUN apk add --no-cache netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "start"] 