'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const koa_1 = require('cls-proxify/integration/koa');
const logger_1 = require('../lib/logger');
exports.default = () =>
  (0, koa_1.clsProxifyKoaMiddleware)('clsKeyLogger', (ctx) => {
    const requestId = Number(`${Math.random()}`.replace('0.', ''));
    const clientRequestId = ctx.req.headers['X-Request-ID'];
    return {
      logger: logger_1.originalLogger.child({
        requestId,
        clientRequestId,
        level: 'error',
      }),
    };
  });
//# sourceMappingURL=cls.js.map
