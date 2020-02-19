const path   = require('path');
const config = require('config');
const bunyan = require('bunyan');

const logger = bunyan.createLogger({
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

module.exports = logger;
