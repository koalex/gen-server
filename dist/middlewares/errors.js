'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const os_1 = __importDefault(require('os'));
const path_1 = require('path');
const node_notifier_1 = __importDefault(require('node-notifier'));
const __PROD__ = process.env.NODE_ENV === 'production';
const __DEV__ = process.env.NODE_ENV === 'development';
const errTmpl = (0, fs_1.readFileSync)(
  (0, path_1.join)(__dirname, '../assets/error.pug'),
).toString();
exports.default = (ctx, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      yield next();
      if (
        ctx.response &&
        ctx.response.status &&
        ctx.response.status === 404 &&
        !ctx.request.url.includes('hot-update.json')
      ) {
        ctx.throw(404);
      }
    } catch (err) {
      // FIXME:
      if (__DEV__) {
        node_notifier_1.default.notify({
          title: 'Error',
          message: getMessage(err, ctx, 'text'),
          icon: (0, path_1.join)(__dirname, '../assets/devErrorNotifyIcon.png'),
          sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
          wait: true,
        });
      }
      // TODO: для type = text сделать (проверрить) вывод ошибки
      const preferredType =
        ctx.type && ctx.type.includes('json')
          ? 'json'
          : ctx.accepts('html', 'text', 'json');
      const report = {
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
  });
function getMessage(err, ctx, type = 'json') {
  var _a, _b, _c;
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
          ((_b =
            (_a = ctx.i18n.locales.en) === null || _a === void 0
              ? void 0
              : _a.httpErrors[status]) === null || _b === void 0
            ? void 0
            : _b.toUpperCase()) === err.message.toUpperCase()
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
  if (!message)
    message =
      ((_c = ctx.i18n) === null || _c === void 0
        ? void 0
        : _c.__(`httpErrors.${status}`)) || err.message;
  return message;
}
function getStatus(err, ctx) {
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
//# sourceMappingURL=errors.js.map
