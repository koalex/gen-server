'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const koa_bodyparser_1 = __importDefault(require('koa-bodyparser')); // application/json , application/x-www-form-urlencoded ONLY
function bodyParser(opts = {}) {
  return (0, koa_bodyparser_1.default)(
    Object.assign(
      {
        formLimit: opts.formLimit || '1mb',
        jsonLimit: opts.jsonLimit || '1mb',
        textLimit: opts.textLimit || '1mb',
        xmlLimit: opts.xmlLimit || '1mb',
      },
      opts,
    ),
  );
}
exports.default = bodyParser;
//# sourceMappingURL=bodyParser.js.map
