import { Context, Middleware } from 'koa';
import fs from 'fs';
import crypto from 'crypto';
import { extname, join } from 'path';
import asyncBusboy, { FileReadStream } from 'async-busboy';
import uuid from 'uuid';

type IOptions = {
  uploadsPath: string;
  fields?: number;
  files?: number;
  fieldSize?: number;
  noParseNullUndefined?: boolean;
  parallel?: boolean;
  hashedFilenames?: boolean;
};

export default function multipartParser(
  opts: IOptions = { uploadsPath: join(__dirname, '../../temp') },
): Middleware {
  if (!fs.existsSync(opts.uploadsPath)) fs.mkdirSync(opts.uploadsPath);

  // eslint-disable-next-line consistent-return
  return async (ctx: Context, next: () => Promise<any>) => {
    const contentType = ctx.get('content-type') || '';

    if (
      !['DELETE', 'POST', 'PUT', 'PATCH'].includes(ctx.method) ||
      !contentType.startsWith('multipart/form-data')
    ) {
      // eslint-disable-next-line no-return-await
      return await next();
    }

    const { files, fields } = await asyncBusboy(ctx.req, {
      limits: {
        fields: opts.fields || 200, // NO-FILE-fields max
        files: opts.files || 30, // FILE-fields max
        fieldSize: opts.fieldSize || 1000000 * 10, // MAX FILE SIZE (in bytes) 10MB
        parts: (opts.fields || 200) + (opts.files || 30), // max files
      },
    });

    if (!ctx.request.body) ctx.request.body = {};

    for (const key in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        ctx.request.body[key] = fields[key];
        if (!opts.noParseNullUndefined) {
          if (fields[key] === 'null') ctx.request.body[key] = null;
          if (fields[key] === 'undefined') ctx.request.body[key] = undefined;
        }
      }
    }

    if (files && files.length) {
      const promises = [];

      for (let i = 0; i < files.length; i += 1) {
        if (opts.parallel) {
          promises.push(
            parseFile({
              ctx,
              file: files[i],
              opts,
            }),
          );
        } else {
          // eslint-disable-next-line no-await-in-loop
          await parseFile({
            ctx,
            file: files[i],
            opts,
          });
        }
      }

      if (opts.parallel) {
        await Promise.all(promises);
      }
    }

    await next();
  };
}

async function parseFile({
  ctx,
  file,
  opts,
}: {
  ctx: Context;
  file: FileReadStream;
  opts: IOptions;
}) {
  const { fieldname } = file;

  if (
    !(
      ctx.request.body[fieldname] === undefined ||
      ctx.request.body[fieldname] === null
    )
  ) {
    // TODO: log ?
    // console.warn('Fieldname "' + fieldname + '" duplication.');
  }

  await new Promise<void>((resolve) => {
    let { filename } = file;
    const ext = extname(file.filename);

    if (opts.hashedFilenames) {
      filename =
        crypto.createHash('md5').update(uuid.v1()).digest('hex').slice(0, 15) +
        ext;
    }

    file.pipe(fs.createWriteStream(join(opts.uploadsPath, filename)));

    file.on('end', () => {
      ctx.request.body[fieldname] = filename;
      resolve();
    });
  });
}
