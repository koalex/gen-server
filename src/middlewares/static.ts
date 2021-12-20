import { Context, Middleware } from 'koa';
import { normalize } from 'path';
import serve from 'koa-static';

const __DEV__ = process.env.NODE_ENV === 'development';

export default function Serve(staticPath?: string): Middleware {
  // eslint-disable-next-line consistent-return
  return async (ctx: Context, next: () => Promise<any>) => {
    const url: string = normalize(ctx.request.url);

    if (
      !staticPath ||
      /^[\\/]{1,2}error\.pug/.test(url) ||
      /^[\\/]{1,2}outdatedBrowser\.pug/.test(url)
    ) {
      // eslint-disable-next-line no-return-await
      return await next();
    }

    await serve(staticPath, {
      defer: false,
      index: 'index.html',
      maxage: __DEV__ ? 0 : 86400000 * 30, // 30 days
      gzip: true,
      hidden: false,
    })(ctx, next);
  };
}
