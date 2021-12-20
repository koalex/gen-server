import koaBodyParser, { Options } from 'koa-bodyparser'; // application/json , application/x-www-form-urlencoded ONLY

export default function bodyParser(opts: Options = {}) {
  return koaBodyParser({
    formLimit: opts.formLimit || '1mb',
    jsonLimit: opts.jsonLimit || '1mb',
    textLimit: opts.textLimit || '1mb',
    xmlLimit: opts.xmlLimit || '1mb',
    ...opts,
  });
}
