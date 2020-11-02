// TODO: add benchmark? http://thecodebarbarian.com/whats-new-in-mongoose-5-improved-post-hooks.html
import os from 'os';
import config from 'config';
import mongoose from 'mongoose'; // TODO: cls-hooked
import uniqueValidator from 'mongoose-unique-validator'; // TODO: не надежно, написать валидатор уникальности
import notifier from 'node-notifier';
import logger from './logger.js';

const log = logger.child({ level: 'error' });

if (process.env.MONGOOSE_DEBUG) mongoose.set('debug', true);

mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);
mongoose.plugin(uniqueValidator);
mongoose.connect(config.mongoose.uri, config.mongoose.options).catch(err => {
  if (process.env.NODE_ENV === 'development') {
    notifier.notify({
      title: 'mongoose.connect',
      message: err.message,
      // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
      sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
      wait: true
    });
  }
  console.error(err);
  log.fatal(err);
});

mongoose.connection.on('connected', () => {
  if (process.env.NODE_ENV === 'development') console.info('Mongoose connection is open to', config.mongoose.uri);
});

mongoose.connection.on('error', err => {
  if (process.env.NODE_ENV === 'development') {
    notifier.notify({
      title: 'mongoose.connection',
      message: err.message,
      // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
      sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
      wait: true
    });
  }
  console.error(err);
  log.fatal(err);
});

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV === 'development') console.info('Mongoose connection is disconnected');
});

process
  .on('SIGTERM', onSigintSigtermMessage)
  .on('SIGINT', onSigintSigtermMessage)
  .on('message', onSigintSigtermMessage);

function onSigintSigtermMessage(signal) {
  if (['SIGTERM', 'SIGINT', 'shutdown'].every(s => s !== signal)) {
    return;
  }

  if (process.env.NODE_ENV === 'development') console.info('Closing mongoose...');

  mongoose.connection.close(err => {
    if (err) {
      console.error(err);
      log.fatal(err);
      return process.exit(1);
    }
    process.exit(0);
  });
}

export default mongoose;
