'use strict';

const defer = require('config/defer').deferConfig;

module.exports = {
    keys: defer(() => {
        if ('string' === typeof process.env.APP_KEYS) {
            const keys = process.env.APP_KEYS.split(',');

            if (!keys.length) return process.exit(1);

            return keys;
        }
        process.exit(1);
    }),
    secret: defer(() => {
        if ('string' === typeof process.env.SECRET && process.env.SECRET.trim().length) {
            return process.env.SECRET;
        }
        process.exit(1);
    })
};
