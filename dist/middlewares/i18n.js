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
const os_1 = __importDefault(require('os'));
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
// @ts-ignore
const koa_locale_1 = __importDefault(require('koa-locale'));
// @ts-ignore
const koa_i18n_1 = __importDefault(require('koa-i18n'));
const glob_1 = __importDefault(require('glob'));
const node_notifier_1 = __importDefault(require('node-notifier'));
const logger_1 = __importDefault(require('../lib/logger'));
const __DEV__ = process.env.NODE_ENV === 'development';
const defaultLocale = process.env['DEFAULT_LOCALE'] || 'en';
const genServerRoot = path_1.default.join(__dirname, '../../'); // FIXME:
const messagesDir = path_1.default.join(genServerRoot, 'temp/i18n');
const dictionary = {};
createDictionary();
function createDictionary() {
  var _a, _b, _c;
  const localesFilesPaths = new Set([
    ...glob_1.default.sync(`${process.cwd()}/**/i18n/*.json`, {
      ignore: ['**/node_modules/**', '**/temp/i18n/**'],
    }),
  ]);
  if (process.cwd() !== genServerRoot) {
    glob_1.default
      .sync(`${genServerRoot}/src/**/i18n/*.json`)
      .forEach((localePath) => {
        localesFilesPaths.add(localePath);
      });
  }
  for (const filePath of localesFilesPaths) {
    const localeName = path_1.default.basename(filePath, '.json'); // en, ru...
    if (!dictionary[localeName]) {
      dictionary[localeName] = {};
    }
    try {
      Object.assign(
        dictionary[localeName],
        JSON.parse(fs_1.default.readFileSync(filePath).toString()),
      );
    } catch (err) {
      logger_1.default.logger.error(err);
      if (__DEV__) {
        const message =
          ((_b = (_a = err) === null || _a === void 0 ? void 0 : _a.name) ===
            null || _b === void 0
            ? void 0
            : _b.toLowerCase()) === 'syntaxerror'
            ? `i18n: Cannot load locale at path ${filePath} because file is not valid JSON.`
            : (_c = err) === null || _c === void 0
            ? void 0
            : _c.message;
        node_notifier_1.default.notify({
          title: 'i18n',
          message,
          icon: path_1.default.join(
            __dirname,
            '../assets/devErrorNotifyIcon.png',
          ),
          sound: os_1.default.type().toUpperCase() === 'DARWIN' ? 'Blow' : true,
          wait: true,
        });
      }
    }
  }
  for (const localeName in dictionary) {
    if (Object.prototype.hasOwnProperty.call(dictionary, localeName)) {
      fs_1.default.writeFileSync(
        path_1.default.join(messagesDir, `${localeName}.json`),
        JSON.stringify(dictionary[localeName]),
      );
    }
  }
}
function getLocales() {
  return Object.keys(dictionary);
}
function I18n(app) {
  const locales = getLocales();
  (0, koa_locale_1.default)(app);
  app.use(
    (0, koa_i18n_1.default)(app, {
      directory: messagesDir,
      locales,
      extension: '.json',
      defaultLocale,
      // We can change position of the elements in the modes array. If one mode is detected, no continue to detect.
      modes: [
        'query',
        'cookie',
        'subdomain',
        'header',
        'url',
        'tld', //  optional detect tld(the last domain) - `koajs.cn`
        // function() {} //  optional custom function (will be bound to the koa context)
      ],
      cookieName: 'locale',
    }),
  );
  app.use((ctx, next) =>
    __awaiter(this, void 0, void 0, function* () {
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
          let localeShort;
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
      yield next();
    }),
  );
}
exports.default = I18n;
//# sourceMappingURL=i18n.js.map
