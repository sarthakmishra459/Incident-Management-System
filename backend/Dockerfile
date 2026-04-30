FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --workspace backend

FROM deps AS build
COPY backend backend
COPY scripts scripts
RUN npm run build --workspace backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend/dist backend/dist
COPY backend/migrations backend/migrations
COPY package.json .
COPY backend/package.json backend/package.json
CMD ["npm", "run", "start", "--workspace", "backend"]
