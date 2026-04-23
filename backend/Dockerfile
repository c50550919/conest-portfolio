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

COPY --chown=node:node . .

RUN npm run build

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]