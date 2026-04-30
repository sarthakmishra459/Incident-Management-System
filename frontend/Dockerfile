FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --workspace frontend

FROM deps AS build
COPY frontend frontend
RUN npm run build --workspace frontend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static frontend/.next/static
COPY --from=build /app/frontend/public frontend/public
CMD ["node", "frontend/server.js"]
