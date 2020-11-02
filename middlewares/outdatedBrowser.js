import path from 'path';
import config from 'config';
import pug from 'pug';
import CLS from 'cls-hooked';
import LRU from 'lru-cache';
import logger from '../lib/logger.js';
import esDirname from '../utils/dirname.js';

const cache  = new LRU({
  max: 5000,
  length: (n, key) => n * 2 + key.length,
  maxAge: 1000 * 60 * 60 // 1hour
});

const log = logger.child({ level: 'error' });

class Locals {
  constructor (ctx) {
    const _url      = new URL(ctx.href);
    this.pretty     = false;
    this.pageTitle  = ctx.i18n.__('outdatedbrowser.HEADER');
    this.homepage   = _url.origin;
    this.i18n       = ctx.i18n;
    this.href       = ctx.href;
    this.userAgent  = ctx.userAgent;
    this.locale     = CLS.getNamespace(config.appName).get('locale');
    this.alternates = Object.keys(ctx.i18n.locales).filter(locale => locale !== ctx.i18n.locale).map(locale => {
      _url.searchParams.set('locale', locale);
      return '<link rel="alternate" hreflang="' + locale + '" href="' + _url.href + '" >'
    });
    _url.searchParams.delete('locale');
    this.alternates.push('<link rel="alternate" hreflang="x-default" href="' + _url.href + '" >');
  }
}

export default function(opts = {}) {
  return async function (ctx, next) {
    await next();

    if ('text/html' === ctx.type && 'GET' === ctx.method && ctx.body && ctx.status !== 404) { // TODO: а если ошибка ?
      const isOutdated = ctx.userAgent.isIE && (parseInt(ctx.userAgent.version) <= (opts.IE || 10));

      if (isOutdated) {
        const cacheKey		= ctx.i18n.locale + ctx.userAgent.browser + parseInt(ctx.userAgent.version);
        const hasPageCache 	= cache.has(cacheKey);

        let page;

        if (hasPageCache) {
          page = cache.get(cacheKey);
        } else {
          const locals = new Locals(ctx);

          try {
            page = pug.renderFile(path.join(esDirname(import.meta), '../static/outdatedBrowser.pug'), locals);
            cache.set(cacheKey, page);
          } catch (err) {
            log.fatal(err);
            page = `<!doctype html><html lang="${ctx.i18n.locale}"><head><meta charset="utf-8"><title>${ctx.i18n.__('outdatedbrowser.HEADER')}</title></head>
                                <body>${ctx.i18n.__('outdatedbrowser.HEADER')}</body></html>`;
          }

        }

        ctx.body = page;
      }
    }
  }
};
