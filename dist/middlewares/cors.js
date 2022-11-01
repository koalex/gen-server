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
const koa2_cors_1 = __importDefault(require('koa2-cors'));
const __PROD__ = process.env.NODE_ENV === 'production';
function Cors(origins = []) {
  const Origins = new Set(origins);
  return (ctx, next) =>
    __awaiter(this, void 0, void 0, function* () {
      let origin;
      const corsProps = {};
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
      if (Origins.has('*')) {
        origin = '*';
        corsProps.exposeHeaders = ['*'];
        corsProps.maxAge = 600 * 10 * 10; // 1000min
        corsProps.credentials = false;
        corsProps.allowMethods = [
          'GET',
          'PUT',
          'POST',
          'PATCH',
          'DELETE',
          'HEAD',
          'OPTIONS',
        ];
        corsProps.allowHeader = ['*'];
        corsProps.allowHeaders = ['*'];
      }
      // TODO: настроить CORS https://www.npmjs.com/package/koa2-cors
      if (origin) {
        return (0, koa2_cors_1.default)(Object.assign({ origin }, corsProps))(
          ctx,
          next,
        );
      }
      return (0, koa2_cors_1.default)()(ctx, next);
    });
}
exports.default = Cors;
//# sourceMappingURL=cors.js.map
