import { KoaContext } from 'types/koa';
import os from 'os';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import locale from 'koa-locale';
// @ts-ignore
import i18n from 'koa-i18n';
import glob from 'glob';
import notifier from 'node-notifier';
import logger from '../lib/logger';

type Dictionary = {
  [key: string]: any;
};

const __DEV__ = process.env.NODE_ENV === 'development';
const defaultLocale = process.env['DEFAULT_LOCALE'] || 'en';
const genServerRoot = path.join(__dirname, '../../');
const messagesDir = path.join(genServerRoot, 'temp/i18n');
const dictionary: Dictionary = {};

createDictionary();

function createDictionary() {
  const localesFilesPaths = new Set<string>([
    ...glob.sync(`${process.cwd()}/**/i18n/*.json`, {
      ignore: ['**/node_modules/**', '**/temp/i18n/**'],
    }),
  ]);

  if (process.cwd() !== genServerRoot) {
    glob
      .sync(`${genServerRoot}/src/**/i18n/*.json`)
      .forEach((localePath: string) => {
        localesFilesPaths.add(localePath);
      });
  }

  for (const filePath of localesFilesPaths) {
    const localeName = path.basename(filePath, '.json'); // en, ru...

    if (!dictionary[localeName]) {
      dictionary[localeName] = {};
    }

    try {
      Object.assign(
        dictionary[localeName],
        JSON.parse(fs.readFileSync(filePath).toString()),
      );
    } catch (err: unknown) {
      logger.logger.error(err);
      if (__DEV__) {
        const message =
          (err as Error)?.name?.toLowerCase() === 'syntaxerror'
            ? `i18n: Cannot load locale at path ${filePath} because file is not valid JSON.`
            : (err as Error)?.message;
        notifier.notify({
          title: 'i18n',
          message,
          icon: path.join(__dirname, '../assets/devErrorNotifyIcon.png'),
          sound: os.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
          wait: true,
        });
      }
    }
  }

  for (const localeName in dictionary) {
    if (Object.prototype.hasOwnProperty.call(dictionary, localeName)) {
      fs.writeFileSync(
        path.join(messagesDir, `${localeName}.json`),
        JSON.stringify(dictionary[localeName]),
      );
    }
  }
}

function getLocales(): string[] {
  return Object.keys(dictionary);
}

export default function I18n(app: any): void {
  const locales: string[] = getLocales();
  locale(app);

  app.use(
    i18n(app, {
      directory: messagesDir,
      locales, // defaultLocale, must match the locales to the filenames
      extension: '.json',
      defaultLocale,
      // We can change position of the elements in the modes array. If one mode is detected, no continue to detect.
      modes: [
        'query', //  optional detect querystring - `/?locale=en-US`
        'cookie', //  optional detect cookie      - `Cookie: locale=zh-TW`
        'subdomain', //  optional detect subdomain   - `zh-CN.koajs.com`
        'header', //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
        'url', //  optional detect url         - `/en`
        'tld', //  optional detect tld(the last domain) - `koajs.cn`
        // function() {} //  optional custom function (will be bound to the koa context)
      ],
      cookieName: 'locale',
    }),
  );

  app.use(async (ctx: KoaContext, next: () => Promise<any>) => {
    ctx.i18n.locale =
      ctx.getLocaleFromQuery() ||
      ctx.getLocaleFromCookie() ||
      ctx.getLocaleFromSubdomain() ||
      ctx.getLocaleFromHeader() ||
      ctx.getLocaleFromUrl() ||
      ctx.getLocaleFromTLD();

    if (ctx.i18n.locale) {
      ctx.i18n._locale = ctx.i18n.locale; // ctx.i18n._locale = ru-RU
      if (!locales.includes(ctx.i18n.locale)) {
        let localeShort: string;
        const match = ctx.i18n.locale.match(/[a-z]{2,3}/i);
        if (match) {
          localeShort = match[0].toLowerCase();
        } else {
          localeShort = defaultLocale;
        }

        if (locales.includes(localeShort)) {
          ctx.i18n.locale = localeShort;
        } else {
          ctx.i18n.locale = defaultLocale;
        }
      }
    } else {
      ctx.i18n.locale = defaultLocale;
    }

    await next();
  });
}
