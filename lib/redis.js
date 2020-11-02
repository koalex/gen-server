import os from 'os';
import config from 'config';
import redis from 'redis';
import logger from './logger.js';
import notifier from 'node-notifier';

const redisClient = redis.createClient({
  host: config.redis.host,
  port: config.redis.port,
  retry_strategy: retryStrategy,
  password: config.redis.pass
});  // TODO: cls-hooked

const log = logger.child({ level: 'error' });

function retryStrategy(options) {
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

redisClient.on('error', err => {
  /* assert(err instanceof redis.AbortError); */
  // RedisError: All errors returned by the client
  // ReplyError subclass of RedisError: All errors returned by Redis itself
  // AbortError subclass of RedisError: All commands that could not finish due to what ever reason
  // ParserError subclass of RedisError: Returned in case of a parser error (this should not happen)
  // AggregateError subclass of AbortError: Emitted in case multiple unresolved commands without callback got rejected in debug_mode instead of lots of AbortErrors.
  if (process.env.NODE_ENV === 'development') {
    notifier.notify({
      title: 'Redis client',
      message: err.message,
      // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
      sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
      wait: true
    });
  }

  console.error(err);
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

  if (process.env.NODE_ENV === 'development') console.info('Closing redis client...');

  redisClient.quit(err => {
    if (err) {
      console.error(err);
      log.fatal(err);
      return process.exit(1);
    }
    process.exit(0);
  });
}

export default redisClient;
