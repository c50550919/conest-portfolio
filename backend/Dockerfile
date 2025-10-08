# Base stage
FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Development stage
FROM base AS development

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Test stage
FROM base AS test

COPY . .

EXPOSE 3000

# Run migrations and tests
CMD ["sh", "-c", "npm run migrate && npm run test"]

# Production stage
FROM base AS production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]