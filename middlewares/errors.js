'use strict';
/*
    TODO: ?
    http://docs.oasis-open.org/odata/odata-json-format/v4.0/errata02/os/odata-json-format-v4.0-errata02-os-complete.html#_Toc403940655
    or
    https://jsonapi.org/examples/#error-objects
*/
const os       = require('os');
const config   = require('config');
const ns       = require('cls-hooked').getNamespace(config.appName);
const notifier = require('node-notifier');
const errTmpl  = require('fs').readFileSync(__dirname + '/../static/error.pug');

module.exports = async (ctx, next) => {
    try {
        await next();

        if (ctx.response && ctx.response.status && ctx.response.status === 404 && !~ctx.request.url.indexOf('hot-update.json')) {
            ctx.throw(404);
        }
    } catch (err) {

        if (__DEV__) {
            console.error(err);
            notifier.notify({
                title: 'NODE.js: Error',
                message: getMessage(err, ctx, 'text'), // FIXME: [Object object]
                // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
                sound: ('DARWIN' == os.type().toUpperCase()) ? 'Blow' : true,
                wait: true
            });
        }

        let report = {
            status: err.status,
            message: err.message,
            stack: err.stack,
            url: ctx.request.url,
            method: ctx.request.method,
            headers: ctx.request.headers,
            referer: ctx.get('referer'),
            cookie: ctx.get('cookie')
        };

        if (!err.expose) report.requestVerbose = ctx.request; // dev error

        if (ctx.state && ctx.state.user) {
            report.user_id = ctx.state.user._id || ctx.state.user.id;
        }

        ctx.log = ns.get('logger');
        ctx.log.error(report);

        // TODO: для type = text сделать (проверрить) вывод ошибки
        let preferredType = (ctx.type && ctx.type.includes('json')) ? 'json' : ctx.accepts('html', 'text', 'json');

        ctx.status = getStatus(err, ctx);

        ctx.set('Content-Language', ctx.i18n.locale);

        if ('json' === preferredType) {
            ctx.body = getMessage(err, ctx, 'json');

            if (err.description) ctx.body.description = err.description;
        } else if ('html' === preferredType) {
            ctx.set('X-Content-Type-Options', 'nosniff');
            ctx.type = 'html';
            let msg = getMessage(err, ctx, 'html');

            try { // check if err tmpl exist && tmpl middleware mount
                ctx.body = ctx.renderString(errTmpl, {
                    status: ctx.status,
                    message: msg
                });
            } catch (err) {
                ctx.body = `<!doctype html><html lang="${ctx.i18n.locale}"><head><meta charset="utf-8"><title>${ctx.status} | ${msg}</title></head>
                <body>${msg}</body></html>`;
            }

        } else {
            ctx.set('X-Content-Type-Options', 'nosniff');
            ctx.body = getMessage(err, ctx, 'text');
        }
    }
};

function getMessage (err, ctx, type = 'json') {
    let message, status = getStatus(err, ctx);

    if (429 === ctx.status || 429 === err.status) {
        let time = /second/i.test(err.message) ? ctx.i18n.__('SECONDS') : ctx.i18n.__('MILLISECONDS');
        message = `${ctx.i18n.__('httpErrors.' + ctx.status)}, ${ctx.i18n.__('RETRY_IN')} ${err.message.match(/\d+/)[0]}${time}.`;
    } else if ('ValidationError' === err.name) {
        message = [];

        for (let field in err.errors) {
            let _message;

            if ( /^Cast/i.test(err.errors[field].message)) {
                _message = ctx.i18n.__('BAD_VALUE');
            } else if (/unique/i.test('err.errors[field].message')) {
                _message = ctx.i18n.__('NOT_UNIQUE');
            } else {
                _message = ctx.i18n.__(err.errors[field].message);
            }

            message.push({
                field,
                message: _message
            });
        }
    } else {
        try {
            message = JSON.parse(err.message);

            if (/^Cast/i.test(message)) message = ctx.i18n.__('BAD_VALUE');
        } catch (_err) {
            if (('string' === typeof err.message)) {
                if ( /^Cast/i.test(err.message)) {
                    message = ctx.i18n.__('BAD_VALUE');
                } else if (/unique/i.test(err.message)) {
                    message = ctx.i18n.__('NOT_UNIQUE');
                } else if (ctx.i18n.locales['en'].httpErrors[status].toUpperCase() === err.message.toUpperCase()) {
                    message = ctx.i18n.__('httpErrors.' + status);
                }
            }
        }
    }

    if ('json' === type) {
        if ('string' === typeof message) {
            message = { message: /^Cast/i.test(message) ? ctx.i18n.__('BAD_VALUE') : message };
        }
    } else {
        if (Array.isArray(message)) {
            message = message.map(data => {
                if (data.message) {
                    if (/^Cast/i.test(data.message)) {
                        data.message = ctx.i18n.__('BAD_VALUE');
                    } else if (/unique/i.test(data.message)) {
                        data.message = ctx.i18n.__('NOT_UNIQUE');
                    }
                    return ctx.i18n.__(data.message);
                }
                if (/^Cast/i.test(data)) {
                    data = ctx.i18n.__('BAD_VALUE');
                } else if (/unique/i.test(data)) {
                    data.message = ctx.i18n.__('NOT_UNIQUE');
                }
                return data;
            }).join(', ');
        } else if ('object' === typeof message) {
            if (message.message) {
                message = /^Cast/i.test(message.message) ? ctx.i18n.__('BAD_VALUE') : ctx.i18n.__(message.message);
            } else {
                message = ctx.i18n.__('httpErrors.' + status);
            }
        }
    }

    // if (!__DEV__ && ctx.status > 501) message = TODO

    if (!message) message = ctx.i18n.__('httpErrors.' + status);

    return message;
}

function getStatus (err, ctx) {
    let status;

    if (err.name === 'CastError' && __PROD__) {
        status = 400;
    } else if ('ValidationError' === err.name) {
        status = 400;
    } else if (__PROD__ && (err.status > 501 || ctx.status > 501)) {
        status = 500;
    } else {
        status = err.status ? err.status : (err.statusCode ? err.statusCode : 500);
    }

    return status
}
