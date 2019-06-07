'use strict';

const path   = require('path');
const config = require('config');
const serve  = require('koa-static');

module.exports = async (ctx, next) => {
    let staticPath = config.staticRoot;
    const url      = path.normalize(ctx.request.url);

    if (/^[\\/]{1,2}error\.pug/.test(url)) {
        return await next();
    }

    if (/^[\\/]{1,2}static[\\/]/.test(url)) {
        staticPath = config.uploadsRoot;
    }

    await serve(staticPath, {
        defer: false,
        index: 'index.html',
        maxage : __DEV__ ? 0 : 86400000*30, // 30 days
        gzip: true,
        hidden: false
    })(ctx, next);

    if (ctx.body && 'text/html' === ctx.type && 'GET' === ctx.method) { // Send to outdated browser check
        await next();
    }
};