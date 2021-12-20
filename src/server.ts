import http, { Server as HttpServer } from 'http';
import https from 'https';
import http2, { Http2SecureServer } from 'http2';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import Koa, { Context, Middleware } from 'koa';
import Socket from './lib/socket';
import KeyGrip from 'keygrip';
import devLogger from 'koa-logger';
import responseTime from 'koa-response-time';
import koaHelmet from 'koa-helmet';
import cors from './middlewares/cors';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';
import { userAgent, UserAgentContext } from 'koa-useragent';
import chalk from 'chalk';
import cls from './middlewares/cls';
import logger from './lib/logger';
import templates from './middlewares/templates';
import outdatedBrowser from './middlewares/outdatedBrowser';
import errors from './middlewares/errors';
import rateLimitMiddleware from './middlewares/rateLimit';
import { MiddlewareOptions as RateLimitOptions } from 'koa-ratelimit';
import serve from './middlewares/static';
import compress from './middlewares/compress';
import i18n from './middlewares/i18n';
// @ts-ignore
import I18n from 'koa-i18n';
import notifier from 'node-notifier';
import Logger from 'bunyan';

type HelmetOptions = Required<Parameters<typeof koaHelmet>>[0];

type Options = {
  port: number;
  protocol?: 'http' | 'https' | 'http2' | 'http/2';
  ws?: boolean;
  origins?: string[];
  proxy?: boolean;
  sslKey?: string;
  sslCert?: string;
  keys?: string[];
  helmet?: HelmetOptions;
  createPidFile?: boolean;
  pidFilePath?: string;
  rateLimit?: RateLimitOptions;
  staticPath?: string;
};

interface BaseUser {
  id?: string | number;
  _id?: string | number;
}

interface State {
  user?: BaseUser;
}

export interface KoaContext extends Context, UserAgentContext {
  compress?: boolean;
  state: State;
  log: Logger;
  render: (templatePathOrTemplateString: string, locals: any) => string;
  i18n: I18n;
  getLocaleFromQuery: () => string;
  getLocaleFromCookie: () => string;
  getLocaleFromSubdomain: () => string;
  getLocaleFromHeader: () => string;
  getLocaleFromUrl: () => string;
  getLocaleFromTLD: () => string;
}

const __DEV__ = process.env.NODE_ENV === 'development';
const unhandledRejections = new Map<Promise<Error>, Error>();

class Server {
  #app: any;

  #server: HttpServer | Http2SecureServer | null = null;

  #sockets: Set<any> = new Set<any>();

  port: number;

  protocol: 'http' | 'https' | 'http2' | 'http/2';

  ws: boolean;

  origins?: string[];

  /*
      If NGINX (or another proxy-server) then set to true
      X-Forwarded-Host
      X-Forwarded-Proto
      X-Forwarded-For ->'unhandledRejection' ip
  */
  proxy: boolean;

  sslKey?: string;

  sslCert?: string;

  keys: string[];

  helmet?: HelmetOptions;

  createPidFile: boolean;

  pidFilePath: string;

  rateLimit?: RateLimitOptions;

  staticPath?: string;

  constructor({
    port,
    protocol = 'http',
    ws = false,
    origins,
    proxy = false,
    sslKey,
    sslCert,
    keys = ['secret1', 'secret2'],
    helmet,
    createPidFile = false,
    pidFilePath = join(process.cwd(), 'process.pid'),
    rateLimit,
    staticPath = join(__dirname, 'assets'),
  }: Options) {
    this.port = port;
    this.protocol = protocol;
    this.ws = ws;
    this.origins = origins;
    this.proxy = proxy;
    this.sslKey = sslKey;
    this.sslCert = sslCert;
    this.keys = keys;
    this.helmet = helmet;
    this.createPidFile = createPidFile;
    this.pidFilePath = pidFilePath;
    this.rateLimit = rateLimit;
    this.staticPath = staticPath;

    this.#app = new Koa<State, KoaContext>();

    process
      .on('unhandledRejection', this.#onUnhandledRejection)
      .on('rejectionHandled', (promise: Promise<Error>) => {
        unhandledRejections.delete(promise);
      })
      .on('uncaughtException', this.#onUncaughtException)
      .on('SIGTERM', this.#onSigintSigterm)
      .on('SIGINT', this.#onSigintSigterm)
      .on('message', this.#onSigintSigterm); // windows
    // TODO: SIGUSR2

    this.#applyMiddlewares();
  }

  get instance(): HttpServer | Http2SecureServer | null {
    return this.#server;
  }

  get app() {
    return this.#app;
  }

  // eslint-disable-next-line class-methods-use-this
  get log() {
    return logger.logger;
  }

  use = (middleware: Middleware) => {
    this.#app.use(middleware);
  };

  #applyMiddlewares() {
    // TODO: проверить порядок MW
    if (process.env.NODE_ENV === 'development') this.#app.use(devLogger());

    this.#app.use(responseTime());
    this.#app.use(koaHelmet(this.helmet));
    this.#app.use(cors(this.origins));
    this.#app.use(conditional());
    this.#app.use(etag());
    this.#app.use(userAgent); // see TS example https://www.npmjs.com/package/koa-useragent#typescript-example
    this.#app.use(cls());
    Object.defineProperty(this.#app.context, 'log', {
      enumerable: true,
      get() {
        return logger.logger; // TODO: проверить работает ли с CLS
      },
    });
    this.#app.use(templates);
    i18n(this.#app);
    this.#app.use(errors);
    this.#app.use(rateLimitMiddleware(this.rateLimit));
    this.#app.use(outdatedBrowser({ IE: 10 }));
    this.#app.use(serve(this.staticPath));
    this.#app.use(compress);
  }

  #onSigintSigterm = (signal: string) => {
    if (['SIGTERM', 'SIGINT', 'shutdown'].every((s: string) => s !== signal)) {
      return;
    }
    this.stop((err?: Error) => {
      if (err) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  };

  #onUnhandledRejection = (err: Error, promise: Promise<Error>) => {
    this.log.fatal(err);
    unhandledRejections.set(promise, err);
    setTimeout(() => {
      if (unhandledRejections.has(promise)) {
        if (__DEV__) {
          notifier.notify({
            title: 'unhandledRejection',
            message: err.message,
            icon: join(__dirname, 'static/devErrorNotifyIcon.png'),
            sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
            wait: true,
          });
        }
        process.exit(1);
      }
    }, 200);
  };

  #onUncaughtException = (err: Error) => {
    this.log.fatal(err);
    let exitCode = 1;
    if (__DEV__) {
      if (err.message.includes('EADDRINUSE')) {
        exitCode = 0;
      } else {
        notifier.notify({
          title: 'uncaughtException',
          message: err.message,
          icon: join(__dirname, 'static/devErrorNotifyIcon.png'),
          sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
          wait: true,
        });
      }
    }
    process.exit(exitCode);
  };

  #onConnection = (socket: any) => {
    this.#sockets.add(socket);
  };

  start = (callback?: () => void) => {
    this.#app.proxy = this.proxy;
    this.#app.keys = new KeyGrip(this.keys, 'sha512');

    switch (this.protocol) {
      case 'http':
        this.#server = http.createServer(this.#app.callback());
        break;
      case 'https':
        this.#server = https.createServer(
          {
            key: this.sslKey,
            cert: this.sslCert,
          },
          this.#app.callback(),
        );
        break;
      case 'http2':
      case 'http/2':
        this.#server = http2.createSecureServer(
          {
            allowHTTP1: this.ws,
            key: this.sslKey,
            cert: this.sslCert,
          },
          this.#app.callback(),
        );
        break;
      default:
        throw new Error(
          `Wrong protocol "${this.protocol}". Must be enum [http, https, http2, http/2].`,
        );
    }

    this.#server.on('connection', this.#onConnection);

    if (this.ws) {
      Socket(this.#server as HttpServer, {
        keys: this.keys,
        origins: this.origins || [],
        protocol: this.protocol,
      });
    }

    const clusterPort: number =
      Number(this.port) +
      (process.env['NODE_APP_INSTANCE']
        ? Number(process.env['NODE_APP_INSTANCE'])
        : 0);
    this.#server.listen(clusterPort, () => {
      if (__DEV__)
        console.info(
          chalk.blue.bgGreen.bold(`SERVER LISTENING ON PORT: ${clusterPort}`),
        );
      if (this.createPidFile)
        fs.writeFileSync(this.pidFilePath, process.pid.toString());
      if (typeof callback === 'function') callback();
    });
  };

  stop = (callback?: (err?: Error) => void) => {
    this.#server?.close((err?: Error) => {
      if (__DEV__) console.info(chalk.blue.bgGreen.bold('SERVER CLOSED'));
      if (err) this.log.fatal(err);
      if (this.createPidFile) fs.unlinkSync(this.pidFilePath);
      if (typeof callback === 'function') callback(err);
    });

    for (const socket of this.#sockets) {
      socket.destroy();
    }
    this.#sockets.clear();
  };
}

export default Server;
