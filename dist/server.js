'use strict';
var __classPrivateFieldSet =
  (this && this.__classPrivateFieldSet) ||
  function (receiver, state, value, kind, f) {
    if (kind === 'm') throw new TypeError('Private method is not writable');
    if (kind === 'a' && !f)
      throw new TypeError('Private accessor was defined without a setter');
    if (
      typeof state === 'function'
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        'Cannot write private member to an object whose class did not declare it',
      );
    return (
      kind === 'a'
        ? f.call(receiver, value)
        : f
        ? (f.value = value)
        : state.set(receiver, value),
      value
    );
  };
var __classPrivateFieldGet =
  (this && this.__classPrivateFieldGet) ||
  function (receiver, state, kind, f) {
    if (kind === 'a' && !f)
      throw new TypeError('Private accessor was defined without a getter');
    if (
      typeof state === 'function'
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        'Cannot read private member from an object whose class did not declare it',
      );
    return kind === 'm'
      ? f
      : kind === 'a'
      ? f.call(receiver)
      : f
      ? f.value
      : state.get(receiver);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _Server_instances,
  _Server_app,
  _Server_server,
  _Server_sockets,
  _Server_applyMiddlewares,
  _Server_onSigintSigterm,
  _Server_onUnhandledRejection,
  _Server_onUncaughtException,
  _Server_onConnection;
Object.defineProperty(exports, '__esModule', { value: true });
const http_1 = __importDefault(require('http'));
const https_1 = __importDefault(require('https'));
const http2_1 = __importDefault(require('http2'));
const fs_1 = __importDefault(require('fs'));
const os_1 = __importDefault(require('os'));
const path_1 = require('path');
const koa_1 = __importDefault(require('koa'));
const socket_1 = __importDefault(require('./lib/socket'));
const keygrip_1 = __importDefault(require('keygrip'));
const koa_logger_1 = __importDefault(require('koa-logger'));
const koa_response_time_1 = __importDefault(require('koa-response-time'));
const koa_helmet_1 = __importDefault(require('koa-helmet'));
const cors_1 = __importDefault(require('./middlewares/cors'));
const koa_conditional_get_1 = __importDefault(require('koa-conditional-get'));
const koa_etag_1 = __importDefault(require('koa-etag'));
const koa_useragent_1 = require('koa-useragent');
const chalk_1 = __importDefault(require('chalk'));
const cls_1 = __importDefault(require('./middlewares/cls'));
const logger_1 = __importDefault(require('./lib/logger'));
const templates_1 = __importDefault(require('./middlewares/templates'));
const outdatedBrowser_1 = __importDefault(
  require('./middlewares/outdatedBrowser'),
);
const errors_1 = __importDefault(require('./middlewares/errors'));
const rateLimit_1 = __importDefault(require('./middlewares/rateLimit'));
const static_1 = __importDefault(require('./middlewares/static'));
const compress_1 = __importDefault(require('./middlewares/compress'));
const i18n_1 = __importDefault(require('./middlewares/i18n'));
const node_notifier_1 = __importDefault(require('node-notifier'));
const __DEV__ = process.env.NODE_ENV === 'development';
const unhandledRejections = new Map();
class Server {
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
    pidFilePath = (0, path_1.join)(process.cwd(), 'process.pid'),
    rateLimit,
    staticPath = (0, path_1.join)(__dirname, 'assets'),
  }) {
    _Server_instances.add(this);
    _Server_app.set(this, void 0);
    _Server_server.set(this, null);
    _Server_sockets.set(this, new Set());
    this.use = (middleware) => {
      __classPrivateFieldGet(this, _Server_app, 'f').use(middleware);
    };
    _Server_onSigintSigterm.set(this, (signal) => {
      if (['SIGTERM', 'SIGINT', 'shutdown'].every((s) => s !== signal)) {
        return;
      }
      this.stop((err) => {
        if (err) {
          process.exit(1);
        } else {
          process.exit(0);
        }
      });
    });
    _Server_onUnhandledRejection.set(this, (err, promise) => {
      this.log.fatal(err);
      unhandledRejections.set(promise, err);
      setTimeout(() => {
        if (unhandledRejections.has(promise)) {
          if (__DEV__) {
            node_notifier_1.default.notify({
              title: 'unhandledRejection',
              message: err.message,
              icon: (0, path_1.join)(
                __dirname,
                'static/devErrorNotifyIcon.png',
              ),
              sound:
                os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
              wait: true,
            });
          }
          process.exit(1);
        }
      }, 200);
    });
    _Server_onUncaughtException.set(this, (err) => {
      this.log.fatal(err);
      let exitCode = 1;
      if (__DEV__) {
        if (err.message.includes('EADDRINUSE')) {
          exitCode = 0;
        } else {
          node_notifier_1.default.notify({
            title: 'uncaughtException',
            message: err.message,
            icon: (0, path_1.join)(__dirname, 'static/devErrorNotifyIcon.png'),
            sound:
              os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
            wait: true,
          });
        }
      }
      process.exit(exitCode);
    });
    _Server_onConnection.set(this, (socket) => {
      __classPrivateFieldGet(this, _Server_sockets, 'f').add(socket);
    });
    this.start = (callback) => {
      __classPrivateFieldGet(this, _Server_app, 'f').proxy = this.proxy;
      __classPrivateFieldGet(this, _Server_app, 'f').keys =
        new keygrip_1.default(this.keys, 'sha512');
      switch (this.protocol) {
        case 'http':
          __classPrivateFieldSet(
            this,
            _Server_server,
            http_1.default.createServer(
              __classPrivateFieldGet(this, _Server_app, 'f').callback(),
            ),
            'f',
          );
          break;
        case 'https':
          __classPrivateFieldSet(
            this,
            _Server_server,
            https_1.default.createServer(
              {
                key: this.sslKey,
                cert: this.sslCert,
              },
              __classPrivateFieldGet(this, _Server_app, 'f').callback(),
            ),
            'f',
          );
          break;
        case 'http2':
        case 'http/2':
          __classPrivateFieldSet(
            this,
            _Server_server,
            http2_1.default.createSecureServer(
              {
                allowHTTP1: this.ws,
                key: this.sslKey,
                cert: this.sslCert,
              },
              __classPrivateFieldGet(this, _Server_app, 'f').callback(),
            ),
            'f',
          );
          break;
        default:
          throw new Error(
            `Wrong protocol "${this.protocol}". Must be enum [http, https, http2, http/2].`,
          );
      }
      __classPrivateFieldGet(this, _Server_server, 'f').on(
        'connection',
        __classPrivateFieldGet(this, _Server_onConnection, 'f'),
      );
      if (this.ws) {
        (0, socket_1.default)(
          __classPrivateFieldGet(this, _Server_server, 'f'),
          {
            keys: this.keys,
            origins: this.origins || [],
            protocol: this.protocol,
          },
        );
      }
      const clusterPort =
        Number(this.port) +
        (process.env['NODE_APP_INSTANCE']
          ? Number(process.env['NODE_APP_INSTANCE'])
          : 0);
      __classPrivateFieldGet(this, _Server_server, 'f').listen(
        clusterPort,
        () => {
          if (__DEV__)
            console.info(
              chalk_1.default.blue.bgGreen.bold(
                `SERVER LISTENING ON PORT: ${clusterPort}`,
              ),
            );
          if (this.createPidFile)
            fs_1.default.writeFileSync(
              this.pidFilePath,
              process.pid.toString(),
            );
          if (typeof callback === 'function') callback();
        },
      );
    };
    this.stop = (callback) => {
      var _a;
      (_a = __classPrivateFieldGet(this, _Server_server, 'f')) === null ||
      _a === void 0
        ? void 0
        : _a.close((err) => {
            if (__DEV__)
              console.info(chalk_1.default.blue.bgGreen.bold('SERVER CLOSED'));
            if (err) this.log.fatal(err);
            if (this.createPidFile) fs_1.default.unlinkSync(this.pidFilePath);
            if (typeof callback === 'function') callback(err);
          });
      for (const socket of __classPrivateFieldGet(this, _Server_sockets, 'f')) {
        socket.destroy();
      }
      __classPrivateFieldGet(this, _Server_sockets, 'f').clear();
    };
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
    __classPrivateFieldSet(this, _Server_app, new koa_1.default(), 'f');
    process
      .on(
        'unhandledRejection',
        __classPrivateFieldGet(this, _Server_onUnhandledRejection, 'f'),
      )
      .on('rejectionHandled', (promise) => {
        unhandledRejections.delete(promise);
      })
      .on(
        'uncaughtException',
        __classPrivateFieldGet(this, _Server_onUncaughtException, 'f'),
      )
      .on('SIGTERM', __classPrivateFieldGet(this, _Server_onSigintSigterm, 'f'))
      .on('SIGINT', __classPrivateFieldGet(this, _Server_onSigintSigterm, 'f'))
      .on(
        'message',
        __classPrivateFieldGet(this, _Server_onSigintSigterm, 'f'),
      ); // windows
    // TODO: SIGUSR2
    __classPrivateFieldGet(
      this,
      _Server_instances,
      'm',
      _Server_applyMiddlewares,
    ).call(this);
  }
  get instance() {
    return __classPrivateFieldGet(this, _Server_server, 'f');
  }
  get app() {
    return __classPrivateFieldGet(this, _Server_app, 'f');
  }
  // eslint-disable-next-line class-methods-use-this
  get log() {
    return logger_1.default.logger;
  }
}
(_Server_app = new WeakMap()),
  (_Server_server = new WeakMap()),
  (_Server_sockets = new WeakMap()),
  (_Server_onSigintSigterm = new WeakMap()),
  (_Server_onUnhandledRejection = new WeakMap()),
  (_Server_onUncaughtException = new WeakMap()),
  (_Server_onConnection = new WeakMap()),
  (_Server_instances = new WeakSet()),
  (_Server_applyMiddlewares = function _Server_applyMiddlewares() {
    // TODO: проверить порядок MW
    if (process.env.NODE_ENV === 'development')
      __classPrivateFieldGet(this, _Server_app, 'f').use(
        (0, koa_logger_1.default)(),
      );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, koa_response_time_1.default)(),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, koa_helmet_1.default)(this.helmet),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, cors_1.default)(this.origins),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, koa_conditional_get_1.default)(),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, koa_etag_1.default)(),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      koa_useragent_1.userAgent,
    ); // see TS example https://www.npmjs.com/package/koa-useragent#typescript-example
    __classPrivateFieldGet(this, _Server_app, 'f').use((0, cls_1.default)());
    Object.defineProperty(
      __classPrivateFieldGet(this, _Server_app, 'f').context,
      'log',
      {
        enumerable: true,
        get() {
          return logger_1.default.logger; // TODO: проверить работает ли с CLS
        },
      },
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(templates_1.default);
    (0, i18n_1.default)(__classPrivateFieldGet(this, _Server_app, 'f'));
    __classPrivateFieldGet(this, _Server_app, 'f').use(errors_1.default);
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, rateLimit_1.default)(this.rateLimit),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, outdatedBrowser_1.default)({ IE: 10 }),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(
      (0, static_1.default)(this.staticPath),
    );
    __classPrivateFieldGet(this, _Server_app, 'f').use(compress_1.default);
  });
exports.default = Server;
//# sourceMappingURL=server.js.map
