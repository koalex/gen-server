'use strict';

const os          	 = require('os');
const config 		 = require('config');
const fs             = require('fs');
const path           = require('path');
const join           = path.join;
const basename       = path.basename;
const extname        = path.extname;
const socketIO 		 = require('socket.io');
const socketIORedis  = require('socket.io-redis');
const Cookies 		 = require('cookies');
const acceptLanguage = require('accept-language');
const i18n           = require('i18n-2');
const notifier    	 = require('node-notifier');
const log            = require('./logger').child({ level: 'error' });

let locales = fs.readdirSync(join(__dirname, '../i18n/data'))
    .filter(localeFileName => extname(localeFileName) === '.json')
    .map(localeFileName => basename(localeFileName, '.json'));

acceptLanguage.languages(locales.length > 0 ? locales : [config.defaultLocale]);

function Socket(server) {
    let ioOpts = {
      cors: {
        origin: (origin, callback) => {
          if (global.__TEST__ && 'test' === origin) return callback(null, true);
          if (config.origins.includes(origin)) return callback(null, true);

          return callback('origin not allowed', false);
        },
        methods: ['GET', 'POST'],
      },
        transports: ['websocket', 'polling'],
        // allowedHeaders: ['my-custom-header'],
        maxHttpBufferSize: 10e7, // how many bytes or characters a message can be, before closing the session (to avoid DoS)
        serveClient: false,
        allowUpgrades: true,
        httpCompression: true,
        cookie: {
          httpOnly: true,
          path: '/',
        },
        wsEngine: 'ws',
    };

    const io = socketIO(server, ioOpts);

    if (!global.__TEST__) {
      const adapter = socketIORedis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.pass,
      });
      io.adapter(adapter);
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
      if (__DEV__) console.info('Closing socket server...');
      io.close();
    }

    Socket.io = io;
    return io;
}
function middleware (socket, next) {
    socket.on('error', onSocketErr);
    let socketLocale = getLocaleFromSocket(socket);
    socket.client.i18n = new i18n({
        directory: join(__dirname, '../i18n/data'),
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
function onConnection (socket) {
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

function onSocketErr (err) {
    if (__DEV__) {
        notifier.notify({
            title: 'NODE.js: socket.io',
            message: err.message,
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
        });
    }
  if (__DEV__) console.error(err);
    log.fatal(err);
}

function getLocaleFromSocket (socket) {
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


/*
* It works only for socket handshake object.
* Does not set cookie for browser.
* TODO: is this function necessary at all ?
* */
function setCookie (name, value) {
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

module.exports = Socket;
