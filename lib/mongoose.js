'use strict';

global.__DEV__   = process.env.NODE_ENV === 'development';
global.__DEBUG__ = process.env.NODE_ENV === 'debug' || process.env.NODE_ENV === 'debugging';
// TODO: add benchmark? http://thecodebarbarian.com/whats-new-in-mongoose-5-improved-post-hooks.html
const os          	  = require('os');
const config          = require('config');
const mongoose        = require('mongoose'); // TODO: cls-hooked
const uniqueValidator = require('mongoose-unique-validator'); // TODO: не надежно, написать валидатор уникальности
const notifier    	  = require('node-notifier');
const log             = require('./logger').child({ level: 'error' });

if (process.env.MONGOOSE_DEBUG || global.__DEBUG__) mongoose.set('debug', true);

mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);
mongoose.plugin(uniqueValidator);
mongoose.connect(config.mongoose.uri, config.mongoose.options).catch(err => {
    if (__DEV__) {
        notifier.notify({
            title: 'mongoose.connect',
            message: err.message,
            // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
        });
    }
  if (__DEV__) console.error(err);
    log.fatal(err);
});

mongoose.connection.on('connected', () => {
    if (__DEV__) console.info('Mongoose connection is open to', config.mongoose.uri);
});

mongoose.connection.on('error', err => {
    if (__DEV__) {
        notifier.notify({
            title: 'mongoose.connection',
            message: err.message,
            // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
        });
    }
  if (__DEV__) console.error(err);
    log.fatal(err);
});

mongoose.connection.on('disconnected', () => {
    if (__DEV__) console.info('Mongoose connection is disconnected');
});

process
    .on('SIGTERM', onSigintSigtermMessage)
    .on('SIGINT', onSigintSigtermMessage)
    .on('message', onSigintSigtermMessage);

function onSigintSigtermMessage(signal) {
  if (['SIGTERM', 'SIGINT', 'shutdown'].every(s => s !== signal)) {
    return;
  }

  if (__DEV__) console.info('Closing mongoose...');

  mongoose.connection.close(err => {
    if (err) {
      if (__DEV__) console.error(err);
      log.fatal(err);
      return process.exit(1);
    }
    process.exit(0);
  });
}

module.exports = mongoose;
