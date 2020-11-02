import ratelimit from 'koa-ratelimit';

let redis;

// TODO: заменить на https://github.com/ysocorp/koa2-ratelimit и для __TEST__ сделать хранение в memory т.к. koa-ratelimit работает только с Redis
export default async (ctx, next) => {
  if (process.env.NODE_ENV === 'test' || (redis && !redis.connected)) {
    await next();
  } else if (!redis) {
    const redisModule = await import('../lib/redis.js');
    redis = redisModule.default;
    await next();
  } else {
    return ratelimit({
      db: redis,
      duration: 60000, // 1min
      id: ctx => ctx.ip,
      throw: true,
      headers: {
        limit: 'X-RateLimit-Limit',
        remaining: 'X-RateLimit-Remaining',
        reset: 'X-RateLimit-Reset',
        total: 'X-Rate-Limit-Total'
      },
      disableHeader: false,
      max: 35000 // IMHO: High Volume API - 2500, Enterprise - 700, Professional - 400, Team - 200
    })(ctx, next);
  }
};
