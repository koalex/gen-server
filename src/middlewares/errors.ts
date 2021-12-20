/* eslint-disable no-param-reassign */
/*
    TODO: ?
    http://docs.oasis-open.org/odata/odata-json-format/v4.0/errata02/os/odata-json-format-v4.0-errata02-os-complete.html#_Toc403940655
    or
    https://jsonapi.org/examples/#error-objects
*/
import { KoaContext } from 'types/koa';
import { readFileSync } from 'fs';
import os from 'os';
import { join } from 'path';
import notifier from 'node-notifier';

const __PROD__ = process.env.NODE_ENV === 'production';
const __DEV__ = process.env.NODE_ENV === 'development';
const errTmpl = readFileSync(join(__dirname, '../assets/error.pug')).toString();

type Report = {
  status: number;
  message: string;
  stack: string;
  url: string;
  method: string;
  headers: any;
  referer: string;
  cookie: string;
  requestVerbose?: any;
  description?: string;
  userId?: string | number;
};

export default async (ctx: KoaContext, next: () => Promise<any>) => {
  try {
    await next();

    if (
      ctx.response &&
      ctx.response.status &&
      ctx.response.status === 404 &&
      !ctx.request.url.includes('hot-update.json')
    ) {
      ctx.throw(404);
    }
  } catch (err: any) {
    // FIXME:
    if (__DEV__) {
      notifier.notify({
        title: 'Error',
        message: getMessage(err, ctx, 'text'), // FIXME: [Object object]
        icon: join(__dirname, '../assets/devErrorNotifyIcon.png'),
        sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
        wait: true,
      });
    }

    // TODO: для type = text сделать (проверрить) вывод ошибки
    const preferredType =
      ctx.type && ctx.type.includes('json')
        ? 'json'
        : ctx.accepts('html', 'text', 'json');
    const report: Report = {
      status: err.status,
      message: err.message,
      stack: err.stack,
      url: ctx.request.url,
      method: ctx.request.method,
      headers: ctx.request.headers,
      referer: ctx.get('referer'),
      cookie: ctx.get('cookie'),
    };

    if (!err.expose) report.requestVerbose = ctx.request; // dev error
    if (err.description) report.description = err.description;

    if (ctx.state && ctx.state.user) {
      report.userId = ctx.state.user._id || ctx.state.user.id;
    }

    ctx.log.error(report);
    ctx.status = getStatus(err, ctx);
    ctx.set('Content-Language', ctx.i18n.locale); // TODO: проверить проставляется ли?

    if (preferredType === 'json') {
      ctx.body = getMessage(err, ctx, 'json');
    } else if (preferredType === 'html') {
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.type = 'html';
      const msg = getMessage(err, ctx, 'html');

      try {
        // check if err tmpl exist && tmpl middleware mount
        ctx.body = ctx.render(errTmpl, {
          status: ctx.status,
          message: msg,
        });
      } catch (e) {
        ctx.log.error(e);

        ctx.body = `<!DOCTYPE html><html lang="${ctx.i18n.locale}">
                        <head><meta charset="utf-8"><title>${ctx.status} | ${msg}</title></head>
                <body>${msg}</body></html>`;
      }
    } else {
      ctx.set('X-Content-Type-Options', 'nosniff');
      ctx.body = getMessage(err, ctx, 'text');
    }
  }
};
function getMessage(err: any, ctx: KoaContext, type = 'json') {
  let message;
  const status = getStatus(err, ctx);

  if (ctx.status === 429 || err.status === 429) {
    const time = /second/i.test(err.message)
      ? ctx.i18n.__('SECONDS')
      : ctx.i18n.__('MILLISECONDS');
    message = `${ctx.i18n.__(`httpErrors.${ctx.status}`)}, ${ctx.i18n.__(
      'RETRY_IN',
    )} ${err.message.match(/\d+/)[0]}${time}.`;
  } else if (err.name === 'ValidationError') {
    message = [];

    if (typeof err.errors === 'object') {
      for (const field in err.errors) {
        if (Object.prototype.hasOwnProperty.call(err.errors, field)) {
          let msg;

          if (/^Cast/i.test(err.errors[field].message)) {
            msg = ctx.i18n.__('BAD_VALUE');
          } else if (/unique/i.test('err.errors[field].message')) {
            msg = ctx.i18n.__('NOT_UNIQUE');
          } else {
            msg = ctx.i18n.__(err.errors[field].message);
          }

          message.push({
            field,
            message: msg,
          });
        }
      }
    }
  } else {
    try {
      message = JSON.parse(err.message);
      if (/^Cast/i.test(message)) message = ctx.i18n.__('BAD_VALUE');
    } catch (_err) {
      if (typeof err.message === 'string') {
        if (/^Cast/i.test(err.message)) {
          message = ctx.i18n.__('BAD_VALUE');
        } else if (/unique/i.test(err.message)) {
          message = ctx.i18n.__('NOT_UNIQUE');
        } else if (
          ctx.i18n.locales.en?.httpErrors[status]?.toUpperCase() ===
          err.message.toUpperCase()
        ) {
          message = ctx.i18n.__(`httpErrors.${status}`);
        }
      }
    }
  }

  if (Array.isArray(message)) {
    message = message.map((data) => {
      if (data.message) {
        if (/^Cast/i.test(data.message)) {
          data.message = ctx.i18n.__('BAD_VALUE');
        } else if (/unique/i.test(data.message)) {
          data.message = ctx.i18n.__('NOT_UNIQUE');
        } else {
          data.message = ctx.i18n.__(data.message);
        }
        // return data
      }
      if (/^Cast/i.test(data)) {
        return ctx.i18n.__('BAD_VALUE');
      }
      if (/unique/i.test(data)) {
        data.message = ctx.i18n.__('NOT_UNIQUE');
      }
      return type === 'json' ? data : data.message;
    });

    if (type !== 'json') message = message.join(', ');
  } else if (typeof message === 'object') {
    if (message.message) {
      message = /^Cast/i.test(message.message)
        ? ctx.i18n.__('BAD_VALUE')
        : ctx.i18n.__(message.message);
    } else {
      message = ctx.i18n.__(`httpErrors.${status}`);
    }
  }

  if (type === 'json' && typeof message === 'string') {
    message = {
      message: /^Cast/i.test(message) ? ctx.i18n.__('BAD_VALUE') : message,
    };
  }

  // if (!__DEV__ && ctx.status > 501) message = TODO
  if (!message) message = ctx.i18n?.__(`httpErrors.${status}`) || err.message;

  return message;
}
function getStatus(err: any, ctx: KoaContext) {
  let status;

  if (err.name === 'CastError' && __PROD__) {
    status = 400;
  } else if (err.name === 'ValidationError') {
    status = 400;
  } else if (__PROD__ && (err.status > 501 || ctx.status > 501)) {
    status = 500;
  } else {
    // eslint-disable-next-line no-nested-ternary
    status = err.status ? err.status : err.statusCode ? err.statusCode : 500;
  }

  return status;
}
