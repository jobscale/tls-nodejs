import http from 'http';
import https from 'https';
import fs from 'fs';
import { logger } from '@jobscale/logger';
import { app, errorHandler } from './app/index.js';

const BIND = process.env.BIND || '0.0.0.0';
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const SPORT = Number.parseInt(process.env.SPORT, 10) || 3443;

const httpServer = () => {
  const server = http.createServer((req, res) => app(req, res));
  server.on('error', (e, req, res) => errorHandler(e, req, res));
  server.listen(PORT, BIND, () => {
    logger.info(JSON.stringify({
      Server: 'Started',
      'Listen on': `http://127.0.0.1:${PORT}`,
    }, null, 2));
  });
};

const httpsServer = () => {
  const server = https.createServer({
    cert: fs.readFileSync('jsx.jp/fullchain.pem'),
    key: fs.readFileSync('jsx.jp/privkey.pem'),
  }, (req, res) => app(req, res));
  server.on('error', (e, req, res) => errorHandler(e, req, res));
  server.listen(SPORT, BIND, () => {
    logger.info(JSON.stringify({
      Server: 'Started',
      'Listen on': `https://127.0.0.1:${SPORT}`,
    }, null, 2));
  });
};

const main = async () => {
  httpServer();
  httpsServer();
  return app;
};

export default main();
