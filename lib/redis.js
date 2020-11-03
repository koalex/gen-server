'use strict';

const os          = require('os');
const config      = require('config');
const ioredis = require('ioredis');
const redisClient = new ioredis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy,
    password: config.redis.pass
});  // TODO: cls-hooked
const log         = require('./logger').child({ level: 'error' });
const notifier    = require('node-notifier');


function retryStrategy(times) {
  const delay = Math.min(times * 50, 1000);
  return delay;
}

redisClient.on('error', err => {
    /* assert(err instanceof redis.AbortError); */
    // RedisError: All errors returned by the client
    // ReplyError subclass of RedisError: All errors returned by Redis itself
    // AbortError subclass of RedisError: All commands that could not finish due to what ever reason
    // ParserError subclass of RedisError: Returned in case of a parser error (this should not happen)
    // AggregateError subclass of AbortError: Emitted in case multiple unresolved commands without callback got rejected in debug_mode instead of lots of AbortErrors.
    if (__DEV__) {
        notifier.notify({
            title: 'Redis client',
            message: err.message,
            // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
        });
    }

  if (__DEV__) console.error(err);
    log.fatal(err);
});

process
    .on('SIGTERM', onSigintSigtermMessage)
    .on('SIGINT', onSigintSigtermMessage)
    .on('message', onSigintSigtermMessage);

function onSigintSigtermMessage(signal) {
  if (['SIGTERM', 'SIGINT', 'shutdown'].every(s => s !== signal)) {
    return;
  }

  if (__DEV__) console.info('Closing redis client...');

  redisClient.quit(err => {
    if (err) {
      if (__DEV__) console.error(err);
      log.fatal(err);
      return process.exit(1);
    }
    process.exit(0);
  });
}

module.exports = redisClient;
