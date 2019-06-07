'use strict';

const defer = require('config/defer').deferConfig;

module.exports = {
    secret: defer(() => {
        if ('string' === typeof process.env.APP_KEYS) {
            const keys = process.env.APP_KEYS.split(',');

            if (!keys.length) return process.exit(1);

            return keys;
        }
        process.exit(1);
    })
};
