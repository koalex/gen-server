import { normalize } from 'path';
import config from 'config'
import serve from 'koa-static';

export default async (ctx, next) => {
  const staticPath = config.staticRoot;
  const url = normalize(ctx.request.url);

  if (/^[\\/]{1,2}error\.pug/.test(url) || /^[\\/]{1,2}outdatedBrowser\.pug/.test(url)) {
    return await next();
  }

  await serve(staticPath, {
    defer: false,
    index: 'index.html',
    maxage: process.env.NODE_ENV === 'development' ? 0 : 86400000*30, // 30 days
    gzip: true,
    hidden: false,
  })(ctx, next);
};
