import { join } from 'path';
import bunyan, { LoggerOptions } from 'bunyan';
import { clsProxify } from 'cls-proxify';
import getAppName from '../utils/getAppName';

const logsDestination = process.env['LOGS_PATH']; // || join(__dirname, '../../temp');
let logsPath;

if (logsDestination) {
  logsPath = logsDestination.endsWith('.log')
    ? logsDestination
    : join(logsDestination, 'errors.log');
}

const loggerOpts: LoggerOptions = {
  name: getAppName(),
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

const logger = bunyan.createLogger(loggerOpts);
const loggerCls = clsProxify('clsKeyLogger', { logger });

export const originalLogger = logger;
export default loggerCls;
