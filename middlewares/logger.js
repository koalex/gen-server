'use strict';

const config = require('config');
const CLS    = require('cls-hooked');
const ns     = CLS.getNamespace(config.appName);
const logger = require('../lib/logger');

module.exports = async (ctx, next) => {
	ctx.log = logger.child({
		requestId: ns.get('requestId'),
		level: 'error'
	});
	ns.set('logger', ctx.log);
	await next();
};
