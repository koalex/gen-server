'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _a;
Object.defineProperty(exports, '__esModule', { value: true });
// TODO: add benchmark? http://thecodebarbarian.com/whats-new-in-mongoose-5-improved-post-hooks.html
const os_1 = __importDefault(require('os'));
const path_1 = require('path');
const mongoose_1 = __importDefault(require('mongoose')); // TODO: cls-hooked
const mongoose_unique_validator_1 = __importDefault(
  require('mongoose-unique-validator'),
); // TODO: не надежно, написать валидатор уникальности
const node_notifier_1 = __importDefault(require('node-notifier'));
const logger_1 = __importDefault(require('./logger'));
const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ =
  (_a = process.env.NODE_ENV) === null || _a === void 0
    ? void 0
    : _a.toString().startsWith('debug');
const haveMongoDb = !!process.env['MONGO_USER'];
const { logger: log } = logger_1.default;
const connectionUri = getConnectionUri();
const options = {
  authSource: 'admin',
  replicaSet: process.env['MONGO_REPL_SET_NAME'],
  dbName: process.env['MONGO_DB_NAME'],
  // user: process.env.MONGO_USER,
  // pass: process.env.MONGO_PASS,
  autoIndex: false,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
};
if (process.env['MONGOOSE_DEBUG'] || __DEBUG__)
  mongoose_1.default.set('debug', true);
mongoose_1.default.Promise = global.Promise;
mongoose_1.default.plugin(mongoose_unique_validator_1.default);
if (haveMongoDb) {
  mongoose_1.default.connect(connectionUri, options).catch((err) => {
    if (__DEV__) {
      node_notifier_1.default.notify({
        title: 'mongoose.connect',
        message: err.message,
        icon: (0, path_1.join)(__dirname, '../assets/devErrorNotifyIcon.png'),
        sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
        wait: true,
      });
    }
    log.fatal(err);
  });
}
mongoose_1.default.connection.on('error', (err) => {
  if (__DEV__) {
    node_notifier_1.default.notify({
      title: 'mongoose.connection',
      message: err.message,
      icon: (0, path_1.join)(__dirname, '../assets/devErrorNotifyIcon.png'),
      sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
      wait: true,
    });
  }
  log.fatal(err);
});
if (__DEV__ && haveMongoDb) {
  mongoose_1.default.connection.on('connected', () => {
    console.info('Mongoose connection is open to', connectionUri);
  });
  mongoose_1.default.connection.on('disconnected', () => {
    console.info('Mongoose connection is disconnected');
  });
}
process
  .on('SIGTERM', onSigintSigtermMessage)
  .on('SIGINT', onSigintSigtermMessage)
  .on('message', onSigintSigtermMessage);
function onSigintSigtermMessage(signal) {
  if (
    ['SIGTERM', 'SIGINT', 'shutdown'].every((s) => s !== signal) ||
    !haveMongoDb
  ) {
    return;
  }
  if (__DEV__) console.info('Closing mongoose...');
  mongoose_1.default.connection.close((err) => {
    if (err) {
      log.fatal(err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
function getConnectionUri() {
  const auth = process.env['MONGO_USER']
    ? `${process.env['MONGO_USER']}:${process.env['MONGO_PASS']}@`
    : '';
  let uri = `mongodb://${auth}${process.env['MONGO_HOST']}/${process.env['MONGO_DB_NAME']}`;
  if (process.env['MONGO_REPL_SET_NAME']) {
    uri += `?replicaSet=${process.env['MONGO_REPL_SET_NAME']}`;
  }
  return uri;
}
exports.default = mongoose_1.default;
//# sourceMappingURL=mongoose.js.map
