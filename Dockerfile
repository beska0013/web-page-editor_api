FROM node:18-slim
RUN apt-get update && apt install -y chromium fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 dbus dbus-x11

COPY . .

RUN npm install && npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]