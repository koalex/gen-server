'use strict';
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
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === 'function')
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (
          e.indexOf(p[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(s, p[i])
        )
          t[p[i]] = s[p[i]];
      }
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _Mailer_instances, _Mailer_transporter, _Mailer_filterEmail;
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const nodemailer_1 = __importDefault(require('nodemailer'));
const disposable_email_domains_1 = __importDefault(
  require('disposable-email-domains'),
);
const isEmail_1 = __importDefault(require('../utils/isEmail'));
let privateKey;
if (process.env['SSL_KEY'])
  privateKey = (0, fs_1.readFileSync)(process.env['SSL_KEY']).toString();
const disposableDomainsSet = new Set(disposable_email_domains_1.default);
const disposable = (email) => {
  var _a;
  const domain =
    (_a = email.split('@').pop()) === null || _a === void 0
      ? void 0
      : _a.toLowerCase();
  if (domain) {
    return disposableDomainsSet.has(domain);
  }
  return false;
};
const defaultOptions = {
  service: process.env['MAILER_SERVICE'] || '',
  smtpHost: process.env['MAILER_HOST'] || '',
  port: Number(process.env['MAILER_PORT']) || 465,
  user: process.env['MAILER_EMAIL'] || '',
  pass: process.env['MAILER_PASS'] || '',
  tls: true,
  rejectUnauthorized: true,
  domain: process.env['HOST'] || '',
  pool: false,
  maxConnections: 15,
  maxMessages: 1000, // if pool = true
};
class Mailer {
  constructor(options = defaultOptions) {
    _Mailer_instances.add(this);
    _Mailer_transporter.set(this, void 0);
    this.send = (options) => {
      const transporter = this.createTransport(false);
      const from = options.from
        ? `${options.from} <${this.settings.user}>`
        : this.settings.user;
      const to = __classPrivateFieldGet(
        this,
        _Mailer_instances,
        'm',
        _Mailer_filterEmail,
      ).call(this, options.to, options.allowDisposable);
      const { subject, text, html, attachments } = options,
        rest = __rest(options, ['subject', 'text', 'html', 'attachments']);
      if (!to) throw new Error('EMAIL_REQUIRED');
      const mailOptions = Object.assign(Object.assign({}, rest), {
        from,
        to,
        subject,
        text,
        html,
        attachments,
      });
      if (!html) delete mailOptions.html;
      if (!(attachments && Array.isArray(attachments)))
        delete mailOptions.attachments;
      return transporter.sendMail(mailOptions);
    };
    this.settings = Object.assign({}, options);
    if (privateKey) {
      this.settings.dkim = {
        domainName: options.domain,
        keySelector: 'default',
        privateKey,
        skipFields: 'message-id:date', // For Amazon SES
      };
    }
    this.createTransport();
  }
  createTransport(force = true) {
    if (!force && __classPrivateFieldGet(this, _Mailer_transporter, 'f')) {
      return __classPrivateFieldGet(this, _Mailer_transporter, 'f');
    }
    const options = {
      service: this.settings.service || undefined,
      host: this.settings.smtpHost,
      port: this.settings.port,
      secure: this.settings.tls,
      tls: this.settings.tls
        ? {
            rejectUnauthorized: this.settings.rejectUnauthorized,
          }
        : undefined,
      auth: {
        user: this.settings.user,
        pass: this.settings.pass,
      },
      pool: this.settings.pool,
      maxConnections: this.settings.maxConnections,
      maxMessages: this.settings.maxMessages,
      dkim: this.settings.dkim,
    };
    __classPrivateFieldSet(
      this,
      _Mailer_transporter,
      nodemailer_1.default.createTransport(options),
      'f',
    );
    return __classPrivateFieldGet(this, _Mailer_transporter, 'f');
  }
}
exports.default = Mailer;
(_Mailer_transporter = new WeakMap()),
  (_Mailer_instances = new WeakSet()),
  (_Mailer_filterEmail = function _Mailer_filterEmail(
    emails,
    allowDisposable = false,
  ) {
    if (Array.isArray(emails)) {
      return emails
        .filter((email) => {
          if (!(0, isEmail_1.default)(email)) {
            // TODO: log
            return false;
          }
          return allowDisposable ? true : !disposable(email);
        })
        .join(', ');
    }
    if (!(0, isEmail_1.default)(emails)) {
      // TODO: log
      return '';
    }
    if (allowDisposable) {
      return emails;
    }
    return disposable(emails) ? '' : emails;
  });
//# sourceMappingURL=nodemailer.js.map
