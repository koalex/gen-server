import { KoaContext } from 'types/koa';
import { extname, isAbsolute } from 'path';
import pug from 'pug';

const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ = process.env.NODE_ENV?.toString().startsWith('debug');

class Locals {
  #ctx;

  private userAgent: any;

  private locale: string;

  [key: string]: any;

  constructor(ctx: KoaContext, locals: any) {
    this.#ctx = ctx;
    this.userAgent = ctx.userAgent;
    this.locale = ctx.i18n.locale;
    for (const key in locals) {
      if (Object.prototype.hasOwnProperty.call(locals, key)) {
        this[key] = locals[key];
      }
    }
  }

  get i18n() {
    return this.#ctx.i18n || {}; // assets manifest from webpack
  }

  get user() {
    return (this.#ctx.state && this.#ctx.state.user) || null; // passport sets this further
  }

  get href() {
    return this.#ctx.href;
  }

  get alternates() {
    const url = new URL(this.#ctx.href);
    const alt = Object.keys(this.#ctx.i18n?.locales || {})
      .filter((locale) => locale !== this.#ctx.i18n.locale)
      .map((locale) => {
        url.searchParams.set('locale', locale);

        return `<link rel="alternate" hreflang="${locale}" href="${url.href}" >`;
      });
    url.searchParams.delete('locale');
    alt.push(`<link rel="alternate" hreflang="x-default" href="${url.href}" >`);

    return alt;
  }

  // eslint-disable-next-line class-methods-use-this
  get pretty() {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  get debug() {
    return __DEBUG__;
  }

  // eslint-disable-next-line class-methods-use-this
  get __DEV__() {
    return __DEV__;
  }
}

export default async (ctx: KoaContext, next: () => Promise<any>) => {
  ctx.render = (
    templatePathOrTemplateString: string,
    locals: any = {},
  ): string => {
    const localsFull = new Locals(ctx, locals);
    let path2fileOrTemplate = templatePathOrTemplateString;
    let html;

    if (isAbsolute(templatePathOrTemplateString)) {
      if (extname(path2fileOrTemplate) !== '.pug')
        path2fileOrTemplate += '.pug';
      html = pug.renderFile(path2fileOrTemplate, localsFull);
    } else {
      html = pug.render(path2fileOrTemplate, localsFull);
    }

    ctx.body = html;

    return html;
  };

  await next();
};
