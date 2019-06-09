'use strict';

global.__PROD__  = process.env.NODE_ENV === 'production';
global.__STAGE__ = process.env.NODE_ENV === 'stage';
global.__DEV__ 	 = process.env.NODE_ENV === 'development';
global.__TEST__  = process.env.NODE_ENV === 'test';
global.__DEBUG__ = process.env.NODE_ENV === 'debug' || process.env.NODE_ENV === 'debugging';

const semver = require('semver');

if (semver.lt(semver.clean(process.versions.node), '10.10.0') || parseFloat(process.versions.v8) < 6.8) {
    console.log('\n*************************************************\n* Для запуска требуется Node.js v10.10.0 и выше\n* Для запуска требуется V8 v6.8 и выше\n* ===============================================\n* Текущая версия Node.js ' + process.versions.node + '\n* Текущая версия V8 ' + process.versions.v8 + '\n*************************************************\n');
    process.exit(0);
}
require('dotenv').config();
const path = require('path');
process.env.NODE_CONFIG_DIR = path.join(__dirname, '../config');
// require('events').EventEmitter.defaultMaxListeners = Infinity;

const os          	= require('os');
const http 			= require('http');
const https			= require('https');
const http2 		= require('http2');
const config        = require('config');
const KeyGrip       = require('keygrip');
const koa           = require('koa');
const app           = new koa();
const Router        = require('../lib/router');
const router        = new Router;
const cors 			= require('koa2-cors');
const CLS           = require('cls-hooked');
const ns            = CLS.createNamespace(config.appName);
const debug         = require('../lib/debug');
const logger        = require('../lib/logger');
const devLogger     = require('koa-logger');
const helmet        = require('koa-helmet');
const userAgent     = require('koa-useragent');
const responseTime  = require('koa-response-time');
const conditional   = require('koa-conditional-get');
const etag          = require('koa-etag');
const compose       = require('koa-compose');
const glob          = require('glob');
const notifier    	= require('node-notifier');
const i18n          = require('../i18n/index');

const unhandledRejections = new Map();
process
    .on('unhandledRejection', (err, p) => {
        unhandledRejections.set(p, err);
        setTimeout(function () {
            if (unhandledRejections.has(p)) {
                if (!__TEST__) console.error(err);
                if (__DEV__) {
                    notifier.notify({
                        title: 'NODE.js: unhandledRejection',
                        message: err.message,
                        // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
                        sound: ('DARWIN' == os.type().toUpperCase()) ? 'Blow' : true,
                        wait: true
                    });
                }
                debug('unhandledRejection: ' + err.message);
                logger.fatal(err);
                process.exit(1);
            }
        }, 200);
    })
	.on('rejectionHandled', p => {
        debug('rejectionHandled: ' + unhandledRejections.get(p).message);
        unhandledRejections.delete(p);
	})
	.on('uncaughtException', err => {
        if (!__TEST__) console.error(err);
        if (__DEV__) {
            notifier.notify({
                title: 'NODE.js: uncaughtException',
                message: err.message,
                // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
                sound: ('DARWIN' == os.type().toUpperCase()) ? 'Blow' : true,
                wait: true
            });
        }
        debug('uncaughtException: ' + err.message);
		logger.fatal(err);
		process.exit(1);
	})
    .on('SIGTERM', onSigintSigtermMessage('SIGTERM'))
    .on('SIGINT', onSigintSigtermMessage('SIGINT'))
	.on('message', onSigintSigtermMessage('message'));

function onSigintSigtermMessage (signal) {
    return function (msg) {
        if ('message' === signal && 'shutdown' !== msg) return; // windows

        if (__DEV__) {
            console.info('\n' + signal +' signal received.');
            console.info('Closing server...');
        }
        // Stops the server from accepting new connections and finishes existing connections.
        server.close(err => {
            if (err) {
                console.error(err);
                logger.fatal(err);
                return process.exit(1);
            }
            process.exit(0);
        });
    }
}
// TODO: ?
/*app.on('error', (err, ctx) => {
    if (err.code === 'ENOENT') ctx.status = 404;
    logger.fatal(err);
});*/

if (__DEV__) {
    process.once('SIGUSR2', () => { // for nodemon
        console.info('SIGUSR2 signal received.');
        process.kill(process.pid, 'SIGUSR2');
        /*server.close(err => {
            if (err) console.error(err);
            process.kill(process.pid, 'SIGUSR2');
        });*/
    });
}

app.keys = new KeyGrip(config.secret, 'sha512');

/*
	If NGINX (or another proxy-server) then set to true
	X-Forwarded-Host
	X-Forwarded-Proto
	X-Forwarded-For -> ip
*/
app.proxy = true;

app.use(responseTime());

if (process.env.TRACE) require('../lib/trace')();
app.use((ctx, next) => {
    const origin = config.origins.find(origin => origin === ctx.origin);
    if (origin) {
        return cors({
            origin
        })(ctx, next);
    }
    return cors()(ctx, next);
});
if (__DEV__ || __DEBUG__) app.use(devLogger());

app.use(helmet());
app.use(conditional());
app.use(etag());
app.use(async (ctx, next) => {
	await next();

    if (!ctx.expires) return;
    ctx.expires = 2;
    ctx.set('Expires', new Date(Date.now() + ctx.expires*1e3).toUTCString());
});

app.use(userAgent);

app.use(async (ctx, next) => {
    return new Promise((resolve) => {
        ns.bindEmitter(ctx.req);
        ns.bindEmitter(ctx.res);
        ns.run(async () => {
            let requestId = Number((Math.random() + '').replace(/^0\./,''));
            try {
                ns.set('requestId', requestId);
                await next();
                resolve();
            } finally {
                let nsLogger = ns.get('logger');
                if (nsLogger && nsLogger.fields.requestId != requestId) {
                    console.error('CLS: wrong context', ns.get('logger').fields.requestId, 'should be', requestId);
                }
                resolve();
            }
        });
    });
});

i18n(app);

/** DEFAULT MIDDLEWARES **/
let defaultMiddlewares = [
    'rateLimit.js',
    'outdatedBrowser.js',
    'static.js',
    'compress.js',
	'logger.js',
	'templates.js',
	'errors.js'
].map(mw => path.join(config.projectRoot, 'middlewares', mw));

app.use(compose(defaultMiddlewares.map(mw => {
    if (mw.endsWith('outdatedBrowser.js')) {
        return require(mw)({IE: 10})
    }
    return require(mw);
})));

app.use(async (ctx, next) => {
	ctx.log = ns.get('logger');
	await next();
});

let server;
switch (config.protocol) {
    default:
        throw new Error('Wrong protocol "' + config.protocol + '". Must be enum [http, https, http2, http/2].');
    case 'http':
        server = http.createServer(app.callback());
        break;
    case 'https':
        server = https.createServer(config.ssl, app.callback());
        break;
    case 'http2':
    case 'http/2':
        server = http2.createSecureServer(config.ssl, app.callback());
        break;
}

const socket = require('../lib/socket.js');
socket(server);

/** MODULES MUST BE HERE**/
/*
* require('module)(app)
* */

app.use(async (ctx, next) => {
    await next();
    if (ctx.status === 404) ctx.throw(404);
    if (ctx.status === 405) ctx.throw(405);
    if (ctx.status === 501) ctx.throw(501);
});

router.get('/__user-agent__', ctx => ctx.body = ctx.userAgent);

app
    .use(router.routes())
    .use(router.allowedMethods({throw: false}));

if (!module.parent) {
    server.listen(config.port, () => {
        console.log('SERVER LISTENING ON PORT:', config.port);
    });
}

module.exports = server;
