import '../env.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import http from 'http';
import https from 'https';
import http2 from 'http2';
import KeyGrip from 'keygrip';
import config from 'config';
import Koa from 'koa';
import Router from '../lib/router.js';
import cors from 'koa2-cors';
import CLS from 'cls-hooked';
import debug from '../lib/debug.js';
import logger from '../lib/logger.js'
import devLogger from 'koa-logger';
import helmet from'koa-helmet';
import koaUA from 'koa-useragent';
import responseTime from 'koa-response-time';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';
import notifier from 'node-notifier';
import i18n from '../i18n/index.js';
import io from '../lib/socket.js';
import bodyParser from '../middlewares/bodyParser.js';
import esDirname from '../utils/dirname.js';

const { userAgent } = koaUA;

process.env.NODE_CONFIG_DIR = path.join(esDirname(import.meta), '../config');

const unhandledRejections = new Map();
process
  .on('unhandledRejection', (err, p) => {
    unhandledRejections.set(p, err);
    setTimeout(() => {
      if (unhandledRejections.has(p)) {
        if (process.env.NODE_ENV !== 'test') console.error(err);
        if (process.env.NODE_ENV === 'development') {
          notifier.notify({
            title: 'NODE.js: unhandledRejection',
            message: err.message,
            // icon: path.join(esDirname(import.meta), 'icon.jpg'), // Absolute path (doesn't work on balloons)
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
          });
        }
        debug('unhandledRejection: ' + err.message);
        logger.fatal(err);
        process.exit(1);
      }
    }, 200);
  })
  .on('rejectionHandled', p => {
    debug('rejectionHandled: ' + unhandledRejections.get(p).message);
    unhandledRejections.delete(p);
  })
  .on('uncaughtException', err => {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    if (process.env.NODE_ENV === 'development') {
      if (err.message.includes('EADDRINUSE')) return process.exit(0);
      notifier.notify({
        title: 'NODE.js: uncaughtException',
        message: err.message,
        // icon: path.join(esDirname(import.meta), 'icon.jpg'), // Absolute path (doesn't work on balloons)
        sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
        wait: true
      });
    }
    debug('uncaughtException: ' + err.message);
    logger.fatal(err);
    process.exit(1);
  })
  .on('SIGTERM', onSigintSigterm)
  .on('SIGINT', onSigintSigterm)
  .on('message', onSigintSigterm); // windows

function onSigintSigterm(signal) {
  if (['SIGTERM', 'SIGINT', 'shutdown'].every(s => s !== signal)) {
    return;
  }
  if (process.env.NODE_ENV === 'development') {
    console.info('\n' + signal +' signal received.');
    console.info('Closing server...');
    fs.unlinkSync(esDirname(import.meta) + '/../process.pid');
  }
  // Stops the server from accepting new connections and finishes existing connections.
  server.close(err => {
    if (err) {
      console.error(err);
      logger.fatal(err);
      return process.exit(1);
    }
    process.exit(0);
  });
}

export default init();

async function init() {
  if (process.env.TRACE) {
    const { default: trace } = await import('../lib/trace.js');
    trace();
  }

  const app = new Koa();
  const router = new Router;
  const ns = CLS.createNamespace(config.appName);

  app.keys = new KeyGrip(config.keys, 'sha512');

  // TODO: ?
  /*app.on('error', (err, ctx) => {
   if (err.code === 'ENOENT') ctx.status = 404;
   logger.fatal(err);
   });*/

  /*
   If NGINX (or another proxy-server) then set to true
   X-Forwarded-Host
   X-Forwarded-Proto
   X-Forwarded-For -> ip
   */
  app.proxy = !!process.env.PROXY;

  app.use(responseTime());

  app.use((ctx, next) => {
    let origin;

    if (process.env.NODE_ENV !== 'production' && !origin && ctx.headers && ctx.headers.origin) {
      origin = config.origins.find(origin => origin === ctx.headers.origin);
    } else {
      origin = config.origins.find(origin => origin === ctx.origin);
    }

    if (origin) {
      return cors({
        origin
      })(ctx, next);
    }
    return cors()(ctx, next);
  });

  if (process.env.NODE_ENV === 'development') app.use(devLogger());

  app.use(helmet());
  app.use(conditional());
  app.use(etag());
  app.use(async (ctx, next) => {
    await next();

    if (!ctx.expires) return;
    ctx.expires = 2;
    ctx.set('Expires', new Date(Date.now() + ctx.expires*1e3).toUTCString());
  });

  app.use(userAgent);

  app.use(async (ctx, next) => {
    return new Promise((resolve) => {
      ns.bindEmitter(ctx.req);
      ns.bindEmitter(ctx.res);
      ns.run(async () => {
        const requestId = Number((Math.random() + '').replace(/^0\./,''));
        try {
          ns.set('requestId', requestId);
          await next();
          resolve();
        } finally {
          const nsLogger = ns.get('logger');
          if (nsLogger && nsLogger.fields.requestId !== requestId) {
            console.error('CLS: wrong context', ns.get('logger').fields.requestId, 'should be', requestId);
          }
          resolve();
        }
      });
    });
  });

  i18n(app);

  /** DEFAULT MIDDLEWARES **/
  const defaultMiddlewares = [
    'rateLimit.js',
    'outdatedBrowser.js',
    'static.js',
    'compress.js',
    'logger.js',
    'templates.js',
    'errors.js'
  ].map(mw => path.join(config.projectRoot, 'middlewares', mw));

  for (const middlewarePath of defaultMiddlewares) {
    const { default: middleware } = await import(middlewarePath);
    app.use(middlewarePath.endsWith('outdatedBrowser.js') ? middleware({IE: 10}) : middleware);
  }

  app.use(async (ctx, next) => {
    ctx.log = ns.get('logger');
    await next();
  });

  let server;
  switch (config.protocol) {
    default:
      throw new Error('Wrong protocol "' + config.protocol + '". Must be enum [http, https, http2, http/2].');
    case 'http':
      server = http.createServer(app.callback());
      break;
    case 'https':
      server = https.createServer(config.ssl, app.callback());
      break;
    case 'http2':
    case 'http/2':
      server = http2.createSecureServer(config.ssl, app.callback());
      break;
  }

  if (process.env.NODE_ENV === 'development') {
    const socketsMap = {};
    let i = 0;
    server.on('connection', socket => {
      const socketId = ++i;
      socketsMap[socketId] = socket;
      socket.on('close', () => { delete socketsMap[socketId]; });
    });

    process.once('SIGUSR2', () => { // for nodemon
      console.info('SIGUSR2 signal received.');
      server.close(err => {
        if (err) console.error(err);
        process.kill(process.pid, 'SIGUSR2');
      });
      Object.values(socketsMap).forEach(socket => socket.destroy());
    });
  }

  io(server);

  /** MODULES **/
  if (process.env.MODULES) {
    const modulesPaths = process.env.MODULES.split(/\s{0,},\s{0,}/);
    for (const modulePath of modulesPaths) {
      const { default: moduleHandler } = await import(modulePath);
      moduleHandler(app);
    }
  }

  app.use(async (ctx, next) => {
    await next();
    if (ctx.status === 404) ctx.throw(404);
    if (ctx.status === 405) ctx.throw(405);
    if (ctx.status === 501) ctx.throw(501);
  });

  router.get('/__user-agent__', ctx => ctx.body = ctx.userAgent);
  router.post('/log', bodyParser(), ctx => {
    const report = ctx.request.body;
    if (Array.isArray(report)) {
      report.forEach(r => ctx.log.error(r));
    } else {
      ctx.log.error(report);
    }
    ctx.status = 200;
  });

  app
    .use(router.routes())
    .use(router.allowedMethods({ throw: false }));

  if (process.env.NODE_ENV !== 'test') {
    const port = Number(config.port) + (process.env.NODE_APP_INSTANCE ? Number(process.env.NODE_APP_INSTANCE) : 0);
    server.listen(port, () => {
      console.log('SERVER LISTENING ON PORT:', port);
      if (process.env.NODE_ENV === 'development') {
        fs.writeFileSync(esDirname(import.meta) + '/../process.pid', process.pid.toString());
      }
    });
  }

  return server;
}
