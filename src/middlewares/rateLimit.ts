import { Context } from 'koa';
import ratelimit, {
  MiddlewareOptions as RateLimitOptions,
} from 'koa-ratelimit';
import redis from '../lib/redis';

export default function RateLimit(opts?: RateLimitOptions) {
  const rateLimitOpts: RateLimitOptions = {
    driver: 'memory',
    db: new Map(),
    duration: 60000, // 1min
    id: (ctx: Context) => ctx.ip,
    throw: true, // call ctx.throw if true
    headers: {
      // limit: 'X-RateLimit-Limit',
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-Rate-Limit-Total',
    },
    disableHeader: false,
    max: 35000, // IMHO: High Volume API - 2500, Enterprise - 700, Professional - 400, Team - 200
    /* whitelist: (ctx: Context) => {
      // if function returns true, middleware exits before limiting
    }, */
    /* blacklist: (ctx: Context) => {
      // if function returns true, 403 error is thrown
    } */ ...opts,
  };

  if (redis) {
    rateLimitOpts.driver = 'redis';
    rateLimitOpts.db = redis;
  }

  return ratelimit(rateLimitOpts);
}
