'use strict';

const fs          = require('fs');
const extname     = require('path').extname;
const config      = require('config');
const join        = require('path').join;
const asyncBusboy = require('async-busboy');
const crypto      = require('crypto');
const uuid        = require('uuid');

if (!fs.existsSync(config.uploadsRoot)) fs.mkdirSync(config.uploadsRoot);
if (!fs.existsSync(join(config.uploadsRoot, 'static'))) fs.mkdirSync(join(config.uploadsRoot, 'static'));

module.exports = function (opts = {}) {
  return async (ctx, next) => {
    let contentType = ctx.get('content-type') || '';

    if (!~['DELETE', 'POST', 'PUT', 'PATCH'].indexOf(ctx.method) || !contentType.startsWith('multipart/form-data')) {
      return await next();
    }

    const { files, fields } = await asyncBusboy(ctx.req, {
      autoFields: true,
      limits: {
        fields: opts.fields || 200, // NO-FILE-fields max
        files: opts.files || 30, // FILE-fields max
        fieldSize: opts.fieldSize || 1000000 * 20, // MAX FILE SIZE (in bytes) 20MB
        parts: (opts.fields || 200) + (opts.files || 30), // max files
      }
    });

    if (!ctx.request.body) ctx.request.body = {};

    for (let key in fields) {
      ctx.request.body[key] = fields[key];
      if (opts.noParseNullUndefined) continue;
      if ('null' === fields[key]) ctx.request.body[key] = null;
      if ('undefined' === fields[key]) ctx.request.body[key] = undefined;
    }

    if (files && files.length > 0) {
      let promises = [];

      for (let i = 0, l = files.length; i < l; ++i) {
        if (opts.parallel) {
          promises.push(parseFile({
            ctx,
            file: files[i],
            opts
          }));
        } else {
          await parseFile({
            ctx,
            file: files[i],
            opts
          });
        }
      }

      if (opts.parallel) {
        await Promise.all(promises);
      }
    }

    await next();
  }
};

async function parseFile ({ ctx, file, opts }) {
  let fieldname = file.fieldname;

  if (!(ctx.request.body[fieldname] === undefined || ctx.request.body[fieldname] === null)) {
    // TODO: log ?
    console.warn('Fieldname "' + fieldname + '" duplication.');
  }

  await new Promise(resolve => {
    let filename = file.filename;
    let ext      = extname(file.filename);
    if (opts.hashedFilenames) filename = crypto.createHash('md5').update(uuid.v1()).digest('hex').slice(0,15) + ext;

    file.pipe(fs.createWriteStream(join(config.uploadsRoot, 'static', filename)));

    file.on('end', () => {
      ctx.request.body[fieldname] = '/static/' + filename;
      resolve();
    })
  });
}