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
const path_1 = require('path');
const koa_static_1 = __importDefault(require('koa-static'));
const __DEV__ = process.env.NODE_ENV === 'development';
function Serve(staticPath) {
  // eslint-disable-next-line consistent-return
  return (ctx, next) =>
    __awaiter(this, void 0, void 0, function* () {
      const url = (0, path_1.normalize)(ctx.request.url);
      if (
        !staticPath ||
        /^[\\/]{1,2}error\.pug/.test(url) ||
        /^[\\/]{1,2}outdatedBrowser\.pug/.test(url)
      ) {
        // eslint-disable-next-line no-return-await
        return yield next();
      }
      yield (0, koa_static_1.default)(staticPath, {
        defer: false,
        index: 'index.html',
        maxage: __DEV__ ? 0 : 86400000 * 30,
        gzip: true,
        hidden: false,
      })(ctx, next);
    });
}
exports.default = Serve;
//# sourceMappingURL=static.js.map
