import os from 'os';
import config from 'config';
import fs from 'fs';
import path from 'path';
import socketIO from 'socket.io';
import memAdapter from 'socket.io-adapter';
import socketIORedis from 'socket.io-redis';
import Cookies from 'cookies';
import acceptLanguage from 'accept-language';
import i18n from 'i18n-2';
import notifier from 'node-notifier';
import logger from './logger.js';
import esDirname from '../utils/dirname.js';

const log = logger.child({ level: 'error' });
const { join, basename, extname } = path;

let locales = fs.readdirSync(join(esDirname(import.meta), '../i18n/data'))
  .filter(localeFileName => extname(localeFileName) === '.json')
  .map(localeFileName => basename(localeFileName, '.json'));

acceptLanguage.languages(locales.length > 0 ? locales : [config.defaultLocale]);

function Socket(server) {
  let ioOpts = {
    transports: ['websocket'/*, 'polling'*/],
    maxHttpBufferSize: 10e7, // how many bytes or characters a message can be, before closing the session (to avoid DoS)
    serveClient: false,
    allowUpgrades: true,
    httpCompression: true,
    cookie: false,
    // cookiePath: '/',
    // cookieHttpOnly: true,
    wsEngine: 'ws',
    origins: (origin, callback) => {
      if (global.__TEST__ && 'test' === origin) return callback(null, true);
      if (config.origins.includes(origin)) return callback(null, true);

      return callback('origin not allowed', false);
    }
  };

  let io = socketIO.listen(server, ioOpts);

  if (!global.__TEST__) {
    let adapter = socketIORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.pass,
      retry_strategy: redisRetryStrategy
    });

    adapter.pubClient.on('connect', () => {
      io.adapter(adapter);
    });
    // adapter.subClient.on('connect', () => {});

    adapter.pubClient.on('error', err => {
      if ('ECONNREFUSED' === err.code) {
        io.adapter(memAdapter);
      }
      process.env.NODE_ENV === 'development' && console.error(err);
      log.fatal(err);
    });
    adapter.subClient.on('error', err => {
      if ('ECONNREFUSED' === err.code) {
        // io.adapter(memAdapter);
      }
    });
  }

  process
    .on('SIGTERM', onSigintSigtermMessage)
    .on('SIGINT', onSigintSigtermMessage)
    .on('message', onSigintSigtermMessage);

  io.use(middleware);
  io.on('connection', onConnection);

  function onSigintSigtermMessage(signal) {
    if (['SIGTERM', 'SIGINT', 'shutdown'].every(s => s !== signal)) {
      return;
    }
    if (process.env.NODE_ENV === 'development') console.info('Closing socket server...');
    io.close();
  }

  Socket.io = io;
  return io;
}
function middleware(socket, next) {
  socket.on('error', onSocketErr);
  let socketLocale = getLocaleFromSocket(socket);
  socket.client.i18n = new i18n({
    directory: join(esDirname(import.meta), '../i18n/data'),
    locales: locales,
    defaultLocale: config.defaultLocale,
    extension: '.json'
  });
  socket.client.i18n.setLocale(socketLocale);
  socket.on('LOCALE_CHANE', locale => {
    socket.client.i18n.setLocale(locale);
  });
  next();
}
function onConnection(socket) {
  /*socket.on('message', msg => {
   socket.emit('TEST', 'OK'); // только себе
   socket.broadcast.emit('TEST', 'OK'); // всем кроме себя
   socket.volatile.emit('TEST', 'OK'); // сообщение может потеряться (всем включая себя)
   socket.volatile.broadcast.emit('TEST', 'OK'); // сообщение может потеряться (всем кроме себя)

   socket.broadcast.to('room').emit('TEST', 'OK');
   socket.to('room').emit('TEST', 'OK');
   });*/
  // socket.on('disconnect', reason => {}); // TODO:
  if (global.__TEST__) {
    socket.on('__TEST__', message => {
      socket.broadcast.emit('__TEST__', message);
    });
  }
}

function onSocketErr(err) {
  if (process.env.NODE_ENV === 'development') {
    notifier.notify({
      title: 'NODE.js: socket.io',
      message: err.message,
      sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
      wait: true
    });
  }
  console.error(err);
  log.fatal(err);
}

function getLocaleFromSocket(socket) {
  const handshakeData = socket.request; // http(s) request
  const cookies       = new Cookies(handshakeData, {}, {keys: config.keys});
  let locale;

  if (cookies.get('locale')) {
    locale = cookies.get('locale');
  } else if (handshakeData.query && handshakeData.query.locale) {
    locale = handshakeData.query.locale;
  } else if (handshakeData._query && handshakeData._query.locale) {
    locale = handshakeData._query.locale;
  } else if (socket.handshake.headers['accept-language']) {
    locale = acceptLanguage.get(socket.handshake.headers['accept-language']);
  } else {
    locale = config.defaultLocale
  }

  return locale;
}

function redisRetryStrategy(options) {
  if (options.error && options.error.code === 'ECONNREFUSED' && options.attempt > 10) {
    // End reconnecting on a specific error and flush all commands with
    // a individual error
    return new Error('The server refused the connection');
  }
  if (options.total_retry_time > 1000 * 60 * 60) {
    // End reconnecting after a specific timeout and flush all commands
    // with a individual error
    return new Error('Retry time exhausted');
  }
  if (options.attempt > 10) {
    // End reconnecting with built in error
    return undefined;
  }
  // reconnect after
  return 1000;
}


/*
 * It works only for socket handshake object.
 * Does not set cookie for browser.
 * TODO: is this function necessary at all ?
 * */
function setCookie(name, value) {
  const socket = this;
  let done = false;
  const cookieArr = socket.request.headers.cookie.split(/\s{0,};\s{0,}/).reduce((acc, v) => {
    if (v.startsWith(name + '=')) {
      if (value === null) return acc; // remove cookie
      acc.push(`${name}=${encodeURIComponent(value)}`);
      done = true;
    } else {
      acc.push(v);
    }
    return acc;
  }, []);
  if (!done && value !== null) {
    cookieArr.push(`${name}=${encodeURIComponent(value)}`);
  }
  socket.request.headers.cookie = cookieArr.join('; ');
}

export default Socket;
