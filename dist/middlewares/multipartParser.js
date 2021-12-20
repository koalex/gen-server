'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = __importDefault(require('fs'));
const crypto_1 = __importDefault(require('crypto'));
const path_1 = require('path');
const async_busboy_1 = __importDefault(require('async-busboy'));
const uuid_1 = __importDefault(require('uuid'));
function multipartParser(
  opts = { uploadsPath: (0, path_1.join)(__dirname, '../../temp') },
) {
  if (!fs_1.default.existsSync(opts.uploadsPath))
    fs_1.default.mkdirSync(opts.uploadsPath);
  // eslint-disable-next-line consistent-return
  return (ctx, next) =>
    __awaiter(this, void 0, void 0, function* () {
      const contentType = ctx.get('content-type') || '';
      if (
        !['DELETE', 'POST', 'PUT', 'PATCH'].includes(ctx.method) ||
        !contentType.startsWith('multipart/form-data')
      ) {
        // eslint-disable-next-line no-return-await
        return yield next();
      }
      const { files, fields } = yield (0, async_busboy_1.default)(ctx.req, {
        limits: {
          fields: opts.fields || 200,
          files: opts.files || 30,
          fieldSize: opts.fieldSize || 1000000 * 10,
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
            yield parseFile({
              ctx,
              file: files[i],
              opts,
            });
          }
        }
        if (opts.parallel) {
          yield Promise.all(promises);
        }
      }
      yield next();
    });
}
exports.default = multipartParser;
function parseFile({ ctx, file, opts }) {
  return __awaiter(this, void 0, void 0, function* () {
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
    yield new Promise((resolve) => {
      let { filename } = file;
      const ext = (0, path_1.extname)(file.filename);
      if (opts.hashedFilenames) {
        filename =
          crypto_1.default
            .createHash('md5')
            .update(uuid_1.default.v1())
            .digest('hex')
            .slice(0, 15) + ext;
      }
      file.pipe(
        fs_1.default.createWriteStream(
          (0, path_1.join)(opts.uploadsPath, filename),
        ),
      );
      file.on('end', () => {
        ctx.request.body[fieldname] = filename;
        resolve();
      });
    });
  });
}
//# sourceMappingURL=multipartParser.js.map
