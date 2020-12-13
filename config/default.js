'use strict';

const fs      = require('fs');
const path    = require('path');
const join    = path.join;
const defer   = require('config/defer').deferConfig;
const appName = require('../package').name;

module.exports = {
    appName,
    ssl: {
      key: null,
      cert: null,
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
          authSource: 'admin',
            replicaSet: process.env.MONGO_REPL_SET_NAME,
            useNewUrlParser: true,
            useFindAndModify: false,
            useCreateIndex: false,
            useUnifiedTopology: true,
            dbName: process.env.MONGO_DB_NAME,
            // user: process.env.MONGO_USER,
            // pass: process.env.MONGO_PASS,
            autoIndex: false, // Don't build indexes
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
let key, cert;
if (process.env.SSL_KEY) {
  try {
    key = fs.readFileSync(process.env.SSL_KEY);
  } catch (err) {
    console.error('SSL key not found.');
    console.error(err);
    process.exit(1);
  }

  try {
    cert = fs.readFileSync(process.env.SSL_CERT);
  } catch (err) {
    console.error('SSL cert not found.');
    console.error(err);
    process.exit(1);
  }
}

if (key && cert) {
  if (process.env.MAILER_DKIM === 'true') {
    module.exports.nodemailer.dkim = {
      domainName: process.env.HOST,
      keySelector: 'default',
      privateKey: key
    };
  }

  module.exports.ssl.cert = cert;
  module.exports.ssl.key = key;
}
