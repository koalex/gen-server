import { KoaContext } from 'types/koa';
import { join } from 'path';
import pug from 'pug';
import LRU from 'lru-cache';

const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ = process.env.NODE_ENV?.toString().startsWith('debug') || false;

const cache = new LRU({
  max: 5000,
  length: (n: number, key: string) => n * 2 + key.length,
  maxAge: 1000 * 60 * 60, // 1hour
});

class Locals {
  private pretty: boolean;

  private debug: boolean;

  private __DEV__: boolean;

  private pageTitle: string;

  private homepage: string;

  private i18n: () => string;

  private href: string;

  private userAgent: unknown;

  private locale: string;

  private alternates: string[];

  public constructor(ctx: KoaContext) {
    const url = new URL(ctx.href);
    this.pretty = false;
    this.debug = __DEBUG__;
    this.__DEV__ = __DEV__;
    this.pageTitle = ctx.i18n?.__('outdatedbrowser.HEADER');
    this.homepage = url.origin;
    this.i18n = ctx.i18n;
    this.href = ctx.href;
    this.userAgent = ctx.userAgent;
    this.locale = ctx.i18n?.locale;
    this.alternates = Object.keys(ctx.i18n?.locales || {})
      .filter((locale: string) => locale !== ctx.i18n?.locale)
      .map((locale: string): string => {
        url.searchParams.set('locale', locale);
        return `<link rel="alternate" hreflang="${locale}" href="${url.href}">`;
      });
    url.searchParams.delete('locale');
    this.alternates.push(
      `<link rel="alternate" hreflang="x-default" href="${url.href}" >`,
    );
  }
}

type OutdatedOpts = {
  IE?: number;
};

export default function OutdatedBrowser(opts: OutdatedOpts = {}) {
  return async function outdatedBrowserMiddleware(
    ctx: KoaContext,
    next: () => Promise<any>,
  ) {
    await next();

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
        const cacheKey = `${ctx.i18n?.locale}${
          ctx.userAgent?.browser
        }${parseInt(ctx.userAgent?.version, 10)}`;
        const hasPageCache = cache.has(cacheKey);

        let page = '';

        if (hasPageCache) {
          page = (cache.get(cacheKey) || '').toString();
        } else {
          const locals: any = new Locals(ctx);

          try {
            page = pug.renderFile(
              join(__dirname, '../assets/outdatedBrowser.pug'),
              locals,
            );
            // @ts-ignore
            cache.set(cacheKey, page);
          } catch (err) {
            ctx.log.error(err);
            page = `<!DOCTYPE html>
              <html lang="${ctx.i18n?.locale}">
                  <head><meta charset="utf-8"><title>${ctx.i18n?.__(
                    'outdatedbrowser.HEADER',
                  )}</title></head>
                  <body>${ctx.i18n?.__('outdatedbrowser.HEADER')}</body>
              </html>`.replace(/[\r\n]/g, '');
          }
        }

        ctx.body = page;
      }
    }
  };
}
