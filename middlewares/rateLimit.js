'use strict';

const ratelimit = require('koa-ratelimit');
let redis;
if (!global.__TEST__) {
    redis = require('../lib/redis');
}

// TODO: заменить на https://github.com/ysocorp/koa2-ratelimit и для __TEST__ сделать хранение в memory т.к. koa-ratelimit работает только с Redis
module.exports = async (ctx, next) => {
	if (global.__TEST__ || (redis && redis.status !== 'ready')) {
		await next();
	} else {
        return ratelimit({
          driver: 'redis',
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
