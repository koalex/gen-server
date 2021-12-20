import { Context } from 'koa';
import { clsProxifyKoaMiddleware } from 'cls-proxify/integration/koa';
import { originalLogger } from '../lib/logger';

export default () =>
  clsProxifyKoaMiddleware('clsKeyLogger', (ctx: Context) => {
    const requestId = Number(`${Math.random()}`.replace('0.', ''));
    const clientRequestId = ctx.req.headers['X-Request-ID'];

    return {
      logger: originalLogger.child({
        requestId,
        clientRequestId,
        level: 'error',
      }),
    };
  });
