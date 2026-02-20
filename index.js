import http from 'http';
import https from 'https';
import fs from 'fs';
import { logger } from '@jobscale/logger';
import { app, errorHandler } from './app/index.js';

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

const httpServer = () => {
  const server = http.createServer((req, res) => app(req, res));
  server.on('error', (e, req, res) => errorHandler(e, req, res));
  const options = {
    host: '0.0.0.0',
    port: PORT,
  };
  server.listen(options, () => {
    logger.info(JSON.stringify({
      Server: 'Started',
      'Listen on': `http://127.0.0.1:${options.port}`,
    }, null, 2));
  });
};

const httpsServer = () => {
  const server = https.createServer({
    cert: fs.readFileSync('jsx.jp/fullchain.pem'),
    key: fs.readFileSync('jsx.jp/privkey.pem'),
  }, (req, res) => app(req, res));
  server.on('error', (e, req, res) => errorHandler(e, req, res));
  const options = {
    host: '0.0.0.0',
    port: PORT + 1,
  };
  server.listen(options, () => {
    logger.info(JSON.stringify({
      Server: 'Started',
      'Listen on': `https://127.0.0.1:${options.port}`,
    }, null, 2));
  });
};

const main = async () => {
  httpServer();
  httpsServer();
  return app;
};

export default main();
