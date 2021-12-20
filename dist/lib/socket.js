'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const os_1 = __importDefault(require('os'));
const fs_1 = __importDefault(require('fs'));
const path_1 = require('path');
const socket_io_1 = require('socket.io');
const redis_adapter_1 = require('@socket.io/redis-adapter');
const redis_1 = __importDefault(require('./redis'));
const cookies_1 = __importDefault(require('cookies'));
const accept_language_1 = __importDefault(require('accept-language'));
// @ts-ignore
const i18n_2_1 = __importDefault(require('i18n-2'));
const node_notifier_1 = __importDefault(require('node-notifier'));
const logger_1 = __importDefault(require('./logger'));
const __DEV__ = process.env.NODE_ENV === 'development';
const __TEST__ = process.env.NODE_ENV === 'test';
const defaultLocale = process.env['DEFAULT_LOCALE'] || 'en';
const locales = fs_1.default
  .readdirSync((0, path_1.join)(__dirname, '../../temp/i18n'))
  .filter((localeFileName) => (0, path_1.extname)(localeFileName) === '.json')
  .map((localeFileName) => (0, path_1.basename)(localeFileName, '.json'));
const { logger: log } = logger_1.default;
accept_language_1.default.languages(
  locales.length > 0 ? locales : [defaultLocale],
);
function Socket(server, { keys, origins, protocol }) {
  // TODO: https://socket.io/docs/v4/server-options/#permessagedeflate
  const ioOpts = {
    // https://socket.io/docs/v4/server-options
    path: '/websocket',
    connectTimeout: 45000,
    allowRequest: (req, callback) => {
      var _a;
      const origin =
        (_a = req.headers) === null || _a === void 0 ? void 0 : _a.origin;
      if (__TEST__ && origin === 'test') return callback(null, true);
      if (origin && origins.includes(origin)) return callback(null, true);
      return callback('origin not allowed', false);
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
    serveClient: false,
    allowUpgrades: true,
    httpCompression: true,
    cookie: {
      name: 'ws',
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: ['https', 'http2', 'http/2'].some(
        (httpProtocol) => httpProtocol === protocol,
      ),
    },
  };
  if (redis_1.default) {
    ioOpts.adapter = (0, redis_adapter_1.createAdapter)(
      redis_1.default,
      redis_1.default.duplicate(),
    );
  }
  const io = new socket_io_1.Server(server, ioOpts);
  process
    .on('SIGTERM', onSigintSigtermMessage)
    .on('SIGINT', onSigintSigtermMessage)
    .on('message', onSigintSigtermMessage);
  io.use(getMiddleware(keys));
  io.on('connection', onConnection);
  function onSigintSigtermMessage(signal) {
    if (['SIGTERM', 'SIGINT', 'shutdown'].every((s) => s !== signal)) {
      return;
    }
    if (__DEV__) console.info('Closing socket server...');
    io.close();
  }
  // @ts-ignore
  Socket.io = io;
  return io;
}
exports.default = Socket;
function getMiddleware(keys) {
  return (socket, next) => {
    socket.on('error', onSocketErr);
    // eslint-disable-next-line no-param-reassign
    socket.client.i18n = new i18n_2_1.default({
      directory: (0, path_1.join)(__dirname, '../../temp/i18n'),
      locales,
      defaultLocale,
      extension: '.json',
    });
    socket.client.i18n.setLocale(getLocaleFromSocket(socket, keys));
    socket.on('LOCALE_CHANGE', (locale) => {
      socket.client.i18n.setLocale(locale);
    });
    next();
  };
}
function onConnection(socket) {
  /* socket.on('message', msg => {
     socket.emit('TEST', 'OK'); // только себе
     socket.broadcast.emit('TEST', 'OK'); // всем кроме себя
     socket.volatile.emit('TEST', 'OK'); // сообщение может потеряться (всем включая себя)
     socket.volatile.broadcast.emit('TEST', 'OK'); // сообщение может потеряться (всем кроме себя)
  
     socket.broadcast.to('room').emit('TEST', 'OK');
     socket.to('room').emit('TEST', 'OK');
     }); */
  // socket.on('disconnect', reason => {}); // TODO:
  if (__TEST__) {
    socket.on('__TEST__', (message) => {
      socket.broadcast.emit('__TEST__', message);
    });
  }
}
function onSocketErr(err) {
  if (__DEV__) {
    node_notifier_1.default.notify({
      title: 'NODE.js: socket.io',
      message: err instanceof Error ? err.message : 'Error',
      sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
      wait: true,
    });
  }
  log.fatal(err);
}
function getLocaleFromSocket(socket, keys) {
  const socketHttpRequest = socket.request;
  const cookies = new cookies_1.default(
    socketHttpRequest,
    {},
    {
      keys,
    },
  );
  let locale = defaultLocale;
  if (cookies.get('locale')) {
    locale = cookies.get('locale') || '';
  } else if (socket.handshake.query && socket.handshake.query['locale']) {
    locale = socket.handshake.query['locale'];
  } else if (socket.handshake.headers['accept-language']) {
    locale =
      accept_language_1.default.get(
        socket.handshake.headers['accept-language'],
      ) || '';
  }
  if (Array.isArray(locale)) locale = locale.join('');
  return locale;
}
//# sourceMappingURL=socket.js.map
