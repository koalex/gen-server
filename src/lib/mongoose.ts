// TODO: add benchmark? http://thecodebarbarian.com/whats-new-in-mongoose-5-improved-post-hooks.html
import os from 'os';
import { join } from 'path';
import mongoose, { ConnectionOptions } from 'mongoose'; // TODO: cls-hooked
import uniqueValidator from 'mongoose-unique-validator'; // TODO: не надежно, написать валидатор уникальности
import notifier from 'node-notifier';
import Logger from './logger';

const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ = process.env.NODE_ENV?.toString().startsWith('debug');
const haveMongoDb = !!process.env['MONGO_USER'];
const { logger: log } = Logger;
const connectionUri = getConnectionUri();
const options: ConnectionOptions = {
  authSource: 'admin',
  replicaSet: process.env['MONGO_REPL_SET_NAME'],
  dbName: process.env['MONGO_DB_NAME'],
  // user: process.env.MONGO_USER,
  // pass: process.env.MONGO_PASS,
  autoIndex: false, // Don't build indexes
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
};

if (process.env['MONGOOSE_DEBUG'] || __DEBUG__) mongoose.set('debug', true);

mongoose.Promise = global.Promise;
mongoose.plugin(uniqueValidator);
if (haveMongoDb) {
  mongoose.connect(connectionUri, options).catch((err) => {
    if (__DEV__) {
      notifier.notify({
        title: 'mongoose.connect',
        message: err.message,
        icon: join(__dirname, '../assets/devErrorNotifyIcon.png'),
        sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
        wait: true,
      });
    }
    log.fatal(err);
  });
}

mongoose.connection.on('error', (err) => {
  if (__DEV__) {
    notifier.notify({
      title: 'mongoose.connection',
      message: err.message,
      icon: join(__dirname, '../assets/devErrorNotifyIcon.png'),
      sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
      wait: true,
    });
  }
  log.fatal(err);
});

if (__DEV__ && haveMongoDb) {
  mongoose.connection.on('connected', () => {
    console.info('Mongoose connection is open to', connectionUri);
  });

  mongoose.connection.on('disconnected', () => {
    console.info('Mongoose connection is disconnected');
  });
}

process
  .on('SIGTERM', onSigintSigtermMessage)
  .on('SIGINT', onSigintSigtermMessage)
  .on('message', onSigintSigtermMessage);

function onSigintSigtermMessage(signal: string) {
  if (
    ['SIGTERM', 'SIGINT', 'shutdown'].every((s) => s !== signal) ||
    !haveMongoDb
  ) {
    return;
  }

  if (__DEV__) console.info('Closing mongoose...');

  mongoose.connection.close((err) => {
    if (err) {
      log.fatal(err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

function getConnectionUri(): string {
  const auth = process.env['MONGO_USER']
    ? `${process.env['MONGO_USER']}:${process.env['MONGO_PASS']}@`
    : '';
  let uri = `mongodb://${auth}${process.env['MONGO_HOST']}/${process.env['MONGO_DB_NAME']}`;

  if (process.env['MONGO_REPL_SET_NAME']) {
    uri += `?replicaSet=${process.env['MONGO_REPL_SET_NAME']}`;
  }
  return uri;
}

export default mongoose;
