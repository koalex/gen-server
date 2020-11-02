import path from 'path';
import config from 'config';
import bunyan from 'bunyan';

export default bunyan.createLogger({
  name: config.appName,
  streams: [
    {
      level: 'fatal',
      path: path.join(config.logsRoot, 'errors.log')
    },
    {
      level: 'error',
      path: path.join(config.logsRoot, 'errors.log')
    }
  ]
});
