'use strict';

const fs      = require('fs');
const path    = require('path');
const join    = path.join;
const defer   = require('config/defer').deferConfig;
const appName = require('../package').name;

module.exports = {
    appName,
    ssl: {
        key: defer(cfg => {
            try {
                return fs.readFileSync(process.env.SSL_KEY);
            } catch (err) {
                if (cfg.protocol === 'https' || cfg.protocol === 'http2' || cfg.protocol === 'http/2') {
                    console.error('SSL key not found.');
                    process.exit(1);
                }
            }
        }),
        cert: defer(cfg => {
            try {
                return fs.readFileSync(process.env.SSL_CERT);
            } catch (err) {
                if (cfg.protocol === 'https' || cfg.protocol === 'http2' || cfg.protocol === 'http/2') {
                    console.error('SSL cert not found.');
                    process.exit(1);
                }
            }
        })
    },
    protocol: process.env.PROTOCOL || 'https',
    port: isNaN(Number(process.env.PORT)) ? 3000 : Number(process.env.PORT),
    origins: (process.env.ORIGINS ? process.env.ORIGINS.split(/\s{0,},\s{0,}/) : []).concat(
        process.env.ORIGIN || []
    ),
    staticRoot: process.env.STATIC_PATH || join(__dirname, '../', './static'),
    projectRoot: join(__dirname, '../'),
    logsRoot: process.env.LOGS_PATH || join(__dirname, '../', './logs'),
    uploadsRoot: process.env.UPLOADS_PATH || join(__dirname, '../', './data'),
    defaultLocale: 'ru',
    redis: {
        port: isNaN(Number(process.env.REDIS_PORT)) ? 6379 : Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST || 'localhost',
        pass: process.env.REDIS_PASS || null
    },
    mongoose: {
        uri: defer(() => {
            const auth = process.env.MONGO_USER ? `${process.env.MONGO_USER}:${process.env.MONGO_PASS}@` : '';
            let uri = `mongodb://${auth}${process.env.MONGO_HOST}/${process.env.MONGO_DB_NAME}`;

            if (process.env.MONGO_REPL_SET_NAME) {
                uri += ('?replicaSet=' + process.env.MONGO_REPL_SET_NAME);
            }
            return uri;
        }),
        options: {
            replicaSet: process.env.MONGO_REPL_SET_NAME,
            useNewUrlParser: true,
            useFindAndModify: false,
            useCreateIndex: false,
            useUnifiedTopology: true,
            dbName: process.env.MONGO_DB_NAME,
            // user: process.env.MONGO_USER,
            // pass: process.env.MONGO_PASS,
            autoIndex: false, // Don't build indexes
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 500, // Reconnect every 500ms
            keepAlive: 120,
            keepAliveInitialDelay: 300000,
            poolSize: 10,
            connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            promiseLibrary: global.Promise,
            bufferMaxEntries: 0,
            // family: 4
        }
    },

    nodemailer: {
        service: process.env.MAILER_SERVICE || 'gmail',
        host: process.env.MAILER_HOST || 'smtp-relay.gmail.com',
        port: isNaN(Number(process.env.MAILER_PORT)) ? 25 : Number(process.env.MAILER_PORT),
        secure: defer(cfg => {
            // true for 465, false for other ports on gmail
            return (Number(cfg.nodemailer.port) === 465 || Number(process.env.MAILER_PORT) === 465)
        }),
        auth: {
            user: process.env.MAILER_USER,
            pass: process.env.MAILER_PASS
        }
    },
    crypto: {
        hash: {
            length: 128,
            iterations: 12000
        }
    }
};