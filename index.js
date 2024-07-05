const http = require('http');
const https = require('https');
const fs = require('fs');
const { logger } = require('@jobscale/logger');
const { app, errorHandler } = require('./app');

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;

const httpServer = () => {
  const server = http.createServer(app);
  server.on('error', errorHandler);
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
  }, app);
  server.on('error', errorHandler);
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

module.exports = {
  server: main(),
};
