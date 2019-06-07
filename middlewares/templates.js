'use strict';

const path          = require('path');
const extname       = path.extname;
const config        = require('config');
const pug           = require('pug');
const CLS           = require('cls-hooked');

module.exports = async (ctx, next) => {
    class Locals {
        constructor(locs) {
            this.userAgent  = ctx.userAgent;
            this.locale     = CLS.getNamespace(config.appName).get('locale');
            for (let key in locs) this[key] = locs[key];
        }
        get i18n() {
            return ctx.i18n; // assets manifest from webpack
        }
        get user() {
            return (ctx.state && ctx.state.user) ? ctx.state.user : null; // passport sets this further
        }
        get href () {
            return ctx.href;
        }
        get alternates () {
            const _url = new URL(ctx.href);
            let alt = Object.keys(ctx.i18n.locales).filter(locale => locale !== ctx.i18n.locale).map(locale => {
                _url.searchParams.set('locale', locale);

                return '<link rel="alternate" hreflang="' + locale + '" href="' + _url.href + '" >'
            });
            _url.searchParams.delete('locale');
            alt.push('<link rel="alternate" hreflang="x-default" href="' + _url.href + '" >');

            return alt;
        }
        get pretty() {
            return false;
        }
        get debug() {
            return __DEBUG__;
        }
        get __DEV__() {
            return __DEV__;
        }
    }
    ctx.renderString = (pugStr, locals) => {
        let localsFull = new Locals(locals);

        return pug.render(pugStr, localsFull);
    };

    ctx.renderToString = (templatePath, locals = {}) => {
        let localsFull = new Locals(locals);
        let path2file  = templatePath;

        if (extname(path2file) !== '.pug') path2file += '.pug';

        return pug.renderFile(path2file, localsFull);
    };

    ctx.render = (templatePath, locals = {}) => {
        return (ctx.body = ctx.renderToString(templatePath, locals));
    };

    await next();
};
