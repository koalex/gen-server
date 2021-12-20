'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.originalLogger = void 0;
const path_1 = require('path');
const bunyan_1 = __importDefault(require('bunyan'));
const cls_proxify_1 = require('cls-proxify');
const getAppName_1 = __importDefault(require('../utils/getAppName'));
const logsDestination = process.env['LOGS_PATH']; // || join(__dirname, '../../temp');
let logsPath;
if (logsDestination) {
  logsPath = logsDestination.endsWith('.log')
    ? logsDestination
    : (0, path_1.join)(logsDestination, 'errors.log');
}
const loggerOpts = {
  name: (0, getAppName_1.default)(),
  streams: [
    {
      level: 'fatal',
    },
  ],
};
if (loggerOpts.streams && loggerOpts.streams[0]) {
  if (logsPath) {
    loggerOpts.streams[0].path = logsPath;
  } else {
    loggerOpts.streams[0].stream = process.stderr;
  }
}
const logger = bunyan_1.default.createLogger(loggerOpts);
const loggerCls = (0, cls_proxify_1.clsProxify)('clsKeyLogger', { logger });
exports.originalLogger = logger;
exports.default = loggerCls;
//# sourceMappingURL=logger.js.map
