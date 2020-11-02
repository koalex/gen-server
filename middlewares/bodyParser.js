import koaBodyParser from 'koa-bodyparser'; // application/json , application/x-www-form-urlencoded ONLY

export default function(opts = {}) {
  return koaBodyParser({
    formLimit: opts.formLimit || '1mb',
    jsonLimit: opts.jsonLimit || '1mb',
    textLimit: opts.textLimit || '1mb',
    ...opts
  });
};
