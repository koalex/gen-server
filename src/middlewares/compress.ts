import { KoaContext } from 'types/koa';
import compress from 'koa-compress';
import zlib from 'zlib';

/*
  You can always enable compression by setting ctx.compress = true.
  You can always disable compression by setting ctx.compress = false.

  app.use(async (ctx, next) => {
    ctx.compress = true;
    await next();
  });
*/
/*
Для установки cookie: compress нужно реализовать на клиенте это:
https://hackthestuff.com/article/how-to-detect-internet-speed-in-javascript
*/
export default async (ctx: KoaContext, next: () => Promise<any>) => {
  ctx.compress = ctx.cookies.get('compress')?.toString() === 'true';

  const mw = await compress({
    filter(contentType: string) {
      const contentTypeLower = contentType.toLowerCase();
      return ['text', 'json', 'svg'].some((ct: string) =>
        contentTypeLower.includes(ct),
      );
    },
    threshold: 1024, // if response size < threshold, then no compress...
    gzip: {
      flush: zlib.constants.Z_SYNC_FLUSH,
    },
    deflate: {
      flush: zlib.constants.Z_SYNC_FLUSH,
    },
    br: false, // disable brotli
  })(ctx, next);

  return mw;
};
