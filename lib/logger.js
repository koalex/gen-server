'use strict';

const path   = require('path');
const config = require('config');
const bunyan = require('bunyan');

let logger = bunyan.createLogger({
	name: config.appName,
	streams: [
		{
			level: 'error',
			path: path.join(config.logsRoot, 'errors.log')
		}
	]
});

module.exports = logger;
