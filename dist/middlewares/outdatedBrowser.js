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
var _a;
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = require('path');
const pug_1 = __importDefault(require('pug'));
const lru_cache_1 = __importDefault(require('lru-cache'));
const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ =
  ((_a = process.env.NODE_ENV) === null || _a === void 0
    ? void 0
    : _a.toString().startsWith('debug')) || false;
const cache = new lru_cache_1.default({
  max: 5000,
  length: (n, key) => n * 2 + key.length,
  maxAge: 1000 * 60 * 60, // 1hour
});
class Locals {
  constructor(ctx) {
    var _a, _b, _c;
    const url = new URL(ctx.href);
    this.pretty = false;
    this.debug = __DEBUG__;
    this.__DEV__ = __DEV__;
    this.pageTitle =
      (_a = ctx.i18n) === null || _a === void 0
        ? void 0
        : _a.__('outdatedbrowser.HEADER');
    this.homepage = url.origin;
    this.i18n = ctx.i18n;
    this.href = ctx.href;
    this.userAgent = ctx.userAgent;
    this.locale =
      (_b = ctx.i18n) === null || _b === void 0 ? void 0 : _b.locale;
    this.alternates = Object.keys(
      ((_c = ctx.i18n) === null || _c === void 0 ? void 0 : _c.locales) || {},
    )
      .filter((locale) => {
        var _a;
        return (
          locale !==
          ((_a = ctx.i18n) === null || _a === void 0 ? void 0 : _a.locale)
        );
      })
      .map((locale) => {
        url.searchParams.set('locale', locale);
        return `<link rel="alternate" hreflang="${locale}" href="${url.href}">`;
      });
    url.searchParams.delete('locale');
    this.alternates.push(
      `<link rel="alternate" hreflang="x-default" href="${url.href}" >`,
    );
  }
}
function OutdatedBrowser(opts = {}) {
  return function outdatedBrowserMiddleware(ctx, next) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
      yield next();
      if (
        ctx.type === 'text/html' &&
        ctx.method === 'GET' &&
        ctx.body &&
        ctx.status !== 404
      ) {
        // TODO: а если ошибка?
        const isOutdated =
          ctx.userAgent.isIE &&
          parseInt(ctx.userAgent.version, 10) <= (opts.IE || 10);
        if (isOutdated) {
          const cacheKey = `${
            (_a = ctx.i18n) === null || _a === void 0 ? void 0 : _a.locale
          }${
            (_b = ctx.userAgent) === null || _b === void 0 ? void 0 : _b.browser
          }${parseInt(
            (_c = ctx.userAgent) === null || _c === void 0
              ? void 0
              : _c.version,
            10,
          )}`;
          const hasPageCache = cache.has(cacheKey);
          let page = '';
          if (hasPageCache) {
            page = (cache.get(cacheKey) || '').toString();
          } else {
            const locals = new Locals(ctx);
            try {
              page = pug_1.default.renderFile(
                (0, path_1.join)(__dirname, '../assets/outdatedBrowser.pug'),
                locals,
              );
              // @ts-ignore
              cache.set(cacheKey, page);
            } catch (err) {
              ctx.log.error(err);
              page = `<!DOCTYPE html>
              <html lang="${
                (_d = ctx.i18n) === null || _d === void 0 ? void 0 : _d.locale
              }">
                  <head><meta charset="utf-8"><title>${
                    (_e = ctx.i18n) === null || _e === void 0
                      ? void 0
                      : _e.__('outdatedbrowser.HEADER')
                  }</title></head>
                  <body>${
                    (_f = ctx.i18n) === null || _f === void 0
                      ? void 0
                      : _f.__('outdatedbrowser.HEADER')
                  }</body>
              </html>`.replace(/[\r\n]/g, '');
            }
          }
          ctx.body = page;
        }
      }
    });
  };
}
exports.default = OutdatedBrowser;
//# sourceMappingURL=outdatedBrowser.js.map
