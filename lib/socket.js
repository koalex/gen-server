'use strict';

const os          	 = require('os');
const config 		 = require('config');
const fs             = require('fs');
const path           = require('path');
const join           = path.join;
const basename       = path.basename;
const extname        = path.extname;
const socketIO 		 = require('socket.io');
const memAdapter     = require('socket.io-adapter');
const socketIORedis  = require('socket.io-redis');
const Cookies 		 = require('cookies');
const acceptLanguage = require('accept-language');
const i18n           = require('i18n-2');
const notifier    	 = require('node-notifier');
const log            = require('./logger').child({ level: 'error' });

let locales = fs.readdirSync(join(__dirname, '../i18n/data'))
    .filter(localeFileName => extname(localeFileName) == '.json')
    .map(localeFileName => basename(localeFileName, '.json'));

acceptLanguage.languages(locales.length > 0 ? locales : [config.defaultLocale]);

function Socket (server) {
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
            console.error(err);
            log.fatal(err);
        });
        adapter.subClient.on('error', err => {
            if ('ECONNREFUSED' === err.code) {
                // io.adapter(memAdapter);
            }
        });
    }

    process
        .on('SIGTERM', onSigintSigtermMessage('SIGTERM'))
        .on('SIGINT', onSigintSigtermMessage('SIGINT'))
        .on('message', onSigintSigtermMessage('message'));

    /*io.use((socket, next) => {
        // TODO: move to "auth" module
        let token = socket.handshake.query.token;
        return next();
    });*/

    io.on('connection', socket => {
        socket.i18n = new i18n({
            directory: join(__dirname, '../i18n/data'),
            locales: locales,
            defaultLocale: config.defaultLocale,
            extension: '.json'
        });
        socket.i18n.setLocale(getLocaleFromSocket(socket));

        /*socket.use((packet, next) => {
            // TODO: move to "auth" module
            // if (!'auth') {
            //     next(new Error('Not auth'));
            //     socket.disconnect(true);
            //     return;
            // }
            next();
        });*/

        /*socket.on('message', msg => {
            // socket.emit('TEST', 'OK'); // только себе
            // socket.broadcast.emit('TEST', 'OK'); // всем кроме себя
            // socket.volatile.emit('TEST', 'OK'); // сообщение может потеряться (всем включая себя)
            // socket.volatile.broadcast.emit('TEST', 'OK'); // сообщение может потеряться (всем кроме себя)

            // socket.broadcast.to('room').emit('TEST', 'OK');
            // socket.to('room').emit('TEST', 'OK');
        });*/

        socket.on('error', onSocketErr);

        // socket.on('disconnect', reason => {}); // TODO:

        socket.on('LOCALE_CHANE', locale => {
            if (locales.includes(locale)) return socket.i18n.setLocale(locale);
            // TODO: log ?
        });

        if (global.__TEST__) {
            socket.on('__TEST__', message => {
                socket.broadcast.emit('__TEST__', message);
            });
        }
    });

    function onSigintSigtermMessage (signal) {
        return function (msg) {
            if ('message' === signal && 'shutdown' !== msg) return; // windows
            if (__DEV__) console.info('Closing socket server...');
            io.close();
        }
    }

    Socket.io = io;
    return io;
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
    console.error(err);
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

function redisRetryStrategy (options) {
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

module.exports = Socket;
