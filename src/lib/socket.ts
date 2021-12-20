import { Server as HttpServer, ServerResponse, IncomingMessage } from 'http';
import os from 'os';
import fs from 'fs';
import { join, basename, extname } from 'path';
import { Server, ServerOptions, Socket as TSocketBase } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis';
import Cookies from 'cookies';
import acceptLanguage from 'accept-language';
// @ts-ignore
import I18n from 'i18n-2';
import notifier from 'node-notifier';
import Logger from './logger';

type SocketOptions = Partial<ServerOptions>;

type TSocket = TSocketBase & {
  client: {
    i18n: I18n;
  };
};

const __DEV__ = process.env.NODE_ENV === 'development';
const __TEST__ = process.env.NODE_ENV === 'test';
const defaultLocale = process.env['DEFAULT_LOCALE'] || 'en';
const locales = fs
  .readdirSync(join(__dirname, '../../temp/i18n'))
  .filter((localeFileName) => extname(localeFileName) === '.json')
  .map((localeFileName) => basename(localeFileName, '.json'));

const { logger: log } = Logger;

acceptLanguage.languages(locales.length > 0 ? locales : [defaultLocale]);

export default function Socket(
  server: HttpServer,
  {
    keys,
    origins,
    protocol,
  }: {
    keys: string[];
    origins: string[];
    protocol: string;
  },
): Server {
  // TODO: https://socket.io/docs/v4/server-options/#permessagedeflate
  const ioOpts: SocketOptions = {
    // https://socket.io/docs/v4/server-options
    path: '/websocket',
    connectTimeout: 45000,
    allowRequest: (
      req: IncomingMessage,
      callback: (err: string | null | undefined, success: boolean) => void,
    ) => {
      const origin: string | undefined = req.headers?.origin;
      if (__TEST__ && origin === 'test') return callback(null, true);
      if (origin && origins.includes(origin)) return callback(null, true);
      return callback('origin not allowed', false);
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB how many bytes or characters a message can be, before closing the session (to avoid DoS)
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

  if (redis) {
    ioOpts.adapter = createAdapter(redis, redis.duplicate());
  }

  const io = new Server(server, ioOpts);

  process
    .on('SIGTERM', onSigintSigtermMessage)
    .on('SIGINT', onSigintSigtermMessage)
    .on('message', onSigintSigtermMessage);

  io.use(getMiddleware(keys));
  io.on('connection', onConnection);

  function onSigintSigtermMessage(signal: string) {
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

function getMiddleware(
  keys: string[],
): (socket: any, next: (error?: Error) => void) => void {
  return (socket: TSocket, next: (error?: Error) => void): void => {
    socket.on('error', onSocketErr);
    // eslint-disable-next-line no-param-reassign
    socket.client.i18n = new I18n({
      directory: join(__dirname, '../../temp/i18n'),
      locales,
      defaultLocale,
      extension: '.json',
    });
    socket.client.i18n.setLocale(getLocaleFromSocket(socket, keys));
    socket.on('LOCALE_CHANGE', (locale: string) => {
      socket.client.i18n.setLocale(locale);
    });
    next();
  };
}

function onConnection(socket: TSocketBase) {
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

function onSocketErr(err: unknown) {
  if (__DEV__) {
    notifier.notify({
      title: 'NODE.js: socket.io',
      message: err instanceof Error ? err.message : 'Error',
      sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
      wait: true,
    });
  }
  log.fatal(err);
}

function getLocaleFromSocket(
  socket: TSocketBase,
  keys: string[],
): string {
  const socketHttpRequest = socket.request;
  const cookies = new Cookies(socketHttpRequest, {} as ServerResponse, {
    keys,
  });
  let locale: string | string[] = defaultLocale;

  if (cookies.get('locale')) {
    locale = cookies.get('locale') || '';
  } else if (socket.handshake.query && socket.handshake.query['locale']) {
    locale = socket.handshake.query['locale'];
  } else if (socket.handshake.headers['accept-language']) {
    locale =
      acceptLanguage.get(socket.handshake.headers['accept-language']) || '';
  }

  if (Array.isArray(locale)) locale = locale.join('');

  return locale;
}
