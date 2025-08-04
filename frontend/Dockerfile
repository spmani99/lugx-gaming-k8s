# Stage 1: Build the React app
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_ANALYTICS_API
ARG REACT_APP_GAME_API
ARG REACT_APP_ORDER_API
ARG REACT_APP_API_BASE_URL

ENV REACT_APP_ANALYTICS_API=$REACT_APP_ANALYTICS_API
ENV REACT_APP_GAME_API=$REACT_APP_GAME_API
ENV REACT_APP_ORDER_API=$REACT_APP_ORDER_API
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
