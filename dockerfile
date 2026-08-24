FROM node:alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


FROM node:alpine as runner

WORKDIR /app

COPY --from=builder /app/package*.json ./

RUN npm install --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Satori reads the raw font bytes from disk at request time to draw the social
# cards (/api/og), so the runner needs the real files, not just the build's
# bundled CSS. Without this the endpoint 500s and every og:image is broken.
COPY --from=builder /app/fonts ./fonts

EXPOSE 3000

CMD ["npm", "run", "start"]
