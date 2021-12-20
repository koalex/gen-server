'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const koa_ratelimit_1 = __importDefault(require('koa-ratelimit'));
const redis_1 = __importDefault(require('../lib/redis'));
function RateLimit(opts) {
  const rateLimitOpts = Object.assign(
    {
      driver: 'memory',
      db: new Map(),
      duration: 60000,
      id: (ctx) => ctx.ip,
      throw: true,
      headers: {
        // limit: 'X-RateLimit-Limit',
        remaining: 'X-RateLimit-Remaining',
        reset: 'X-RateLimit-Reset',
        total: 'X-Rate-Limit-Total',
      },
      disableHeader: false,
      max: 35000,
    },
    opts,
  );
  if (redis_1.default) {
    rateLimitOpts.driver = 'redis';
    rateLimitOpts.db = redis_1.default;
  }
  return (0, koa_ratelimit_1.default)(rateLimitOpts);
}
exports.default = RateLimit;
//# sourceMappingURL=rateLimit.js.map
