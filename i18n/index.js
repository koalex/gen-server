'use strict';

const os          = require('os');
const fs          = require('fs');
const path        = require('path');
const config      = require('config');
const ns          = require('cls-hooked').getNamespace(config.appName);
const locale      = require('koa-locale');
const i18n        = require('koa-i18n');
const glob        = require('glob');
const notifier    = require('node-notifier');
const log         = require('../lib/logger');

const messagesDir = __dirname + '/data';

createDictionary();

function createDictionary () {
    let dictionary         = {};
    let serverLocalesPaths = [].concat(glob.sync(__dirname + '/*.json'));

    if (process.env.MODULES) {
        process.env.MODULES.split(/\s{0,},\s{0,}/).forEach(m => {
            serverLocalesPaths = serverLocalesPaths.concat(glob.sync(m + '/i18n/*.json'));
        });
    }

    glob.sync(`${messagesDir}/*.json`).forEach(fs.unlinkSync);

    for (let localePath of serverLocalesPaths) {
        let locale = path.basename(localePath, '.json');

        if (!dictionary[locale]) dictionary[locale] = {};

        try {
            dictionary[locale] = Object.assign(dictionary[locale], require(localePath));
        } catch (err) {
            if ('syntaxerror' == err.name.toLowerCase()) {
                let message = 'i18n: Cannot load locale at path ' + localePath + ' because file is not valid JSON.';
                if (__DEV__ || __DEBUG__) {
                    notifier.notify(
                        {
                            title: 'NODE.js: i18n',
                            message: message,
                            // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
                            sound: ('DARWIN' == os.type().toUpperCase()) ? 'Blow' : true,
                            wait: true
                        }
                    );
                }
                console.error(message);
            } else {
                console.error(err);
                if (__DEV__ || __DEBUG__) {
                    notifier.notify(
                        {
                            title: 'NODE.js: i18n',
                            message: err.message,
                            // icon: path.join(__dirname, 'icon.jpg'), // Absolute path (doesn't work on balloons)
                            sound: ('DARWIN' == os.type().toUpperCase()) ? 'Blow' : true,
                            wait: true
                        }
                    );
                }
            }

            log.error(err);
        }
    }

    for (let locale in dictionary) {
        fs.writeFileSync(path.join(messagesDir, locale + '.json'), JSON.stringify(dictionary[locale]));
    }
}

function getLocales () {
    return glob.sync(`${messagesDir}/*.json`).map(localeFileName => path.basename(localeFileName, '.json'));
}

module.exports = function (app) {
    let locales = getLocales();

    locale(app);

    app.use(i18n(app, {
        devMode: __DEV__,
        directory: messagesDir,
        locales: locales, //  defualtLocale, must match the locales to the filenames
        extension: '.json',
        defaultLocale: config.defaultLocale,
        //We can change position of the elements in the modes array. If one mode is detected, no continue to detect.
        modes: [
            'query',        //  optional detect querystring - `/?locale=en-US`
            'cookie',       //  optional detect cookie      - `Cookie: locale=zh-TW`
            'subdomain',    //  optional detect subdomain   - `zh-CN.koajs.com`
            'header',       //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
            'url',          //  optional detect url         - `/en`
            'tld'           //  optional detect tld(the last domain) - `koajs.cn`
            //function() {} //  optional custom function (will be bound to the koa context)
        ],
        cookieName: 'locale'
    }));

    app.use(async (ctx, next) => {
        ctx.i18n.locale =  ctx.getLocaleFromQuery()
            || ctx.getLocaleFromCookie()
            || ctx.getLocaleFromSubdomain()
            || ctx.getLocaleFromHeader()
            || ctx.getLocaleFromUrl()
            || ctx.getLocaleFromTLD();

        if (ctx.i18n.locale) {
            ctx.i18n._locale = ctx.i18n.locale; // ctx.i18n._locale = ru-RU
            if (!locales.some(locale => ctx.i18n.locale === locale)) {
                let localeShort = ((ctx.i18n.locale).match(/[a-z]{2,3}/i)[0]).toLowerCase();

                if (locales.some(locale => localeShort === locale)) {
                    ctx.i18n.locale = localeShort;
                } else {
                    ctx.i18n.locale = config.defaultLocale;
                }
            }
        } else {
            ctx.i18n.locale = config.defaultLocale;
        }

        ns.set('locale', ctx.i18n.getLocale());

        await next();
    });
};
