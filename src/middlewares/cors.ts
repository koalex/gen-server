import { Context, Middleware } from 'koa';
import cors from 'koa2-cors';

const __PROD__ = process.env.NODE_ENV === 'production';

export default function Cors(origins: string[] = []): Middleware {
  const Origins = new Set<string>(origins);

  return async (ctx: Context, next: () => Promise<any>) => {
    let origin;

    if (
      !__PROD__ &&
      ctx.headers &&
      ctx.headers.origin &&
      Origins.has(ctx.headers.origin)
    ) {
      origin = ctx.headers.origin;
    } else if (Origins.has(ctx.origin)) {
      origin = ctx.origin;
    }

    // TODO: настроить CORS https://www.npmjs.com/package/koa2-cors
    if (origin) {
      return cors({
        origin,
      })(ctx, next);
    }
    return cors()(ctx, next);
  };
}
