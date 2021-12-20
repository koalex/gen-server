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
var __classPrivateFieldSet =
  (this && this.__classPrivateFieldSet) ||
  function (receiver, state, value, kind, f) {
    if (kind === 'm') throw new TypeError('Private method is not writable');
    if (kind === 'a' && !f)
      throw new TypeError('Private accessor was defined without a setter');
    if (
      typeof state === 'function'
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        'Cannot write private member to an object whose class did not declare it',
      );
    return (
      kind === 'a'
        ? f.call(receiver, value)
        : f
        ? (f.value = value)
        : state.set(receiver, value),
      value
    );
  };
var __classPrivateFieldGet =
  (this && this.__classPrivateFieldGet) ||
  function (receiver, state, kind, f) {
    if (kind === 'a' && !f)
      throw new TypeError('Private accessor was defined without a getter');
    if (
      typeof state === 'function'
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        'Cannot read private member from an object whose class did not declare it',
      );
    return kind === 'm'
      ? f
      : kind === 'a'
      ? f.call(receiver)
      : f
      ? f.value
      : state.get(receiver);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _a;
var _Locals_ctx;
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = require('path');
const pug_1 = __importDefault(require('pug'));
const __DEV__ = process.env.NODE_ENV === 'development';
const __DEBUG__ =
  (_a = process.env.NODE_ENV) === null || _a === void 0
    ? void 0
    : _a.toString().startsWith('debug');
class Locals {
  constructor(ctx, locals) {
    _Locals_ctx.set(this, void 0);
    __classPrivateFieldSet(this, _Locals_ctx, ctx, 'f');
    this.userAgent = ctx.userAgent;
    this.locale = ctx.i18n.locale;
    for (const key in locals) {
      if (Object.prototype.hasOwnProperty.call(locals, key)) {
        this[key] = locals[key];
      }
    }
  }
  get i18n() {
    return __classPrivateFieldGet(this, _Locals_ctx, 'f').i18n || {}; // assets manifest from webpack
  }
  get user() {
    return (
      (__classPrivateFieldGet(this, _Locals_ctx, 'f').state &&
        __classPrivateFieldGet(this, _Locals_ctx, 'f').state.user) ||
      null
    ); // passport sets this further
  }
  get href() {
    return __classPrivateFieldGet(this, _Locals_ctx, 'f').href;
  }
  get alternates() {
    var _a;
    const url = new URL(__classPrivateFieldGet(this, _Locals_ctx, 'f').href);
    const alt = Object.keys(
      ((_a = __classPrivateFieldGet(this, _Locals_ctx, 'f').i18n) === null ||
      _a === void 0
        ? void 0
        : _a.locales) || {},
    )
      .filter(
        (locale) =>
          locale !== __classPrivateFieldGet(this, _Locals_ctx, 'f').i18n.locale,
      )
      .map((locale) => {
        url.searchParams.set('locale', locale);
        return `<link rel="alternate" hreflang="${locale}" href="${url.href}" >`;
      });
    url.searchParams.delete('locale');
    alt.push(`<link rel="alternate" hreflang="x-default" href="${url.href}" >`);
    return alt;
  }
  // eslint-disable-next-line class-methods-use-this
  get pretty() {
    return false;
  }
  // eslint-disable-next-line class-methods-use-this
  get debug() {
    return __DEBUG__;
  }
  // eslint-disable-next-line class-methods-use-this
  get __DEV__() {
    return __DEV__;
  }
}
_Locals_ctx = new WeakMap();
exports.default = (ctx, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    ctx.render = (templatePathOrTemplateString, locals = {}) => {
      const localsFull = new Locals(ctx, locals);
      let path2fileOrTemplate = templatePathOrTemplateString;
      let html;
      if ((0, path_1.isAbsolute)(templatePathOrTemplateString)) {
        if ((0, path_1.extname)(path2fileOrTemplate) !== '.pug')
          path2fileOrTemplate += '.pug';
        html = pug_1.default.renderFile(path2fileOrTemplate, localsFull);
      } else {
        html = pug_1.default.render(path2fileOrTemplate, localsFull);
      }
      ctx.body = html;
      return html;
    };
    yield next();
  });
//# sourceMappingURL=templates.js.map
