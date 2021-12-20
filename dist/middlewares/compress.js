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
const koa_compress_1 = __importDefault(require('koa-compress'));
const zlib_1 = __importDefault(require('zlib'));
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
exports.default = (ctx, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    ctx.compress =
      ((_a = ctx.cookies.get('compress')) === null || _a === void 0
        ? void 0
        : _a.toString()) === 'true';
    const mw = yield (0, koa_compress_1.default)({
      filter(contentType) {
        const contentTypeLower = contentType.toLowerCase();
        return ['text', 'json', 'svg'].some((ct) =>
          contentTypeLower.includes(ct),
        );
      },
      threshold: 1024,
      gzip: {
        flush: zlib_1.default.constants.Z_SYNC_FLUSH,
      },
      deflate: {
        flush: zlib_1.default.constants.Z_SYNC_FLUSH,
      },
      br: false, // disable brotli
    })(ctx, next);
    return mw;
  });
//# sourceMappingURL=compress.js.map
