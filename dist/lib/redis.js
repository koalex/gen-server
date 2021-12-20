'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const os_1 = __importDefault(require('os'));
const path_1 = require('path');
const ioredis_1 = __importDefault(require('ioredis'));
const logger_1 = __importDefault(require('./logger'));
const node_notifier_1 = __importDefault(require('node-notifier'));
const __DEV__ = process.env.NODE_ENV === 'development';
const { logger: log } = logger_1.default;
let redisClient;
if (
  process.env['REDIS_HOST'] ||
  process.env['REDIS_PORT'] ||
  process.env['REDIS_PASS']
) {
  // TODO: cls-hooked?
  redisClient = new ioredis_1.default({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: Number(process.env['REDIS_PORT']) || 6379,
    retryStrategy: (times) => Math.min(times * 50, 1000),
    password: process.env['REDIS_PASS'],
  });
  redisClient.on('error', (err) => {
    /* assert(err instanceof redis.AbortError); */
    // RedisError: All errors returned by the client
    // ReplyError subclass of RedisError: All errors returned by Redis itself
    // AbortError subclass of RedisError: All commands that could not finish due to what ever reason
    // ParserError subclass of RedisError: Returned in case of a parser error (this should not happen)
    // AggregateError subclass of AbortError: Emitted in case multiple unresolved commands without callback got rejected in debug_mode instead of lots of AbortErrors.
    if (__DEV__) {
      node_notifier_1.default.notify({
        title: 'Redis client',
        message: err.message,
        icon: (0, path_1.join)(__dirname, '../assets/devErrorNotifyIcon.png'),
        sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
        wait: true,
      });
    }
    log.fatal(err);
  });
}
process
  .on('SIGTERM', onSigintSigtermMessage)
  .on('SIGINT', onSigintSigtermMessage)
  .on('message', onSigintSigtermMessage);
function onSigintSigtermMessage(signal) {
  if (['SIGTERM', 'SIGINT', 'shutdown'].every((s) => s !== signal)) {
    return;
  }
  if (__DEV__ && redisClient) console.info('Closing redis client...');
  if (redisClient) {
    redisClient.quit((err) => {
      let exitCode = 0;
      if (err) {
        log.fatal(err);
        exitCode = 1;
      }
      process.exit(exitCode);
    });
  }
}
const RedisClient = redisClient;
exports.default = RedisClient;
//# sourceMappingURL=redis.js.map
