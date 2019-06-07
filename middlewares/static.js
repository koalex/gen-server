'use strict';

const path   = require('path');
const config = require('config');
const serve  = require('koa-static');

module.exports = async (ctx, next) => {
    let staticPath = config.staticRoot;
    let url        = path.normalize(ctx.request.url);

    if (/^[\\/]{1,2}error\.pug/.test(url)) {
        return await next();
    }

    if (/^[\\/]{1,2}static[\\/]/.test(url)) {
        staticPath = config.uploadsRoot;
    }

    return serve(staticPath, {
        maxage : __DEV__ ? 0 : 86400000*30, // 30 days
        gzip: true,
        usePrecompiledGzip: true,
        hidden: false
    })(ctx, next);
};