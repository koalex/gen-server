import config from 'config';
import CLS from 'cls-hooked';
import logger from '../lib/logger.js';

const ns = CLS.getNamespace(config.appName);

export default async (ctx, next) => {
  ctx.log = logger.child({
    requestId: ns.get('requestId'),
    level: 'error'
  });
  ns.set('logger', ctx.log);
  await next();
};
