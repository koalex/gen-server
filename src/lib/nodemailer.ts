import { readFileSync } from 'fs';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import disposableDomains from 'disposable-email-domains';
import isEmail from '../utils/isEmail';

let privateKey: string;
if (process.env['SSL_KEY'])
  privateKey = readFileSync(process.env['SSL_KEY']).toString();

const disposableDomainsSet = new Set<string>(disposableDomains);

const disposable = (email: string): boolean => {
  const domain = email.split('@').pop()?.toLowerCase();

  if (domain) {
    return disposableDomainsSet.has(domain);
  }

  return false;
};

type MailerOptions = {
  service?: string;
  smtpHost?: string;
  port?: number;
  user: string;
  pass: string;
  tls?: boolean;
  rejectUnauthorized?: boolean;
  domain: string;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  dkim?: {
    domainName: string;
    keySelector: string;
    privateKey: string;
    skipFields?: string;
  };
};

type sendOptions = {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: unknown;
  allowDisposable: boolean;
};

type SendResult = {
  // { messageId, accepted: [кто получил], rejected: [кто НЕ получил] }
  messageId: number;
  accepted: string[];
  rejected: string[];
};

const defaultOptions: MailerOptions = {
  service: process.env['MAILER_SERVICE'] || '',
  smtpHost: process.env['MAILER_HOST'] || '',
  port: Number(process.env['MAILER_PORT']) || 465,
  user: process.env['MAILER_EMAIL'] || '',
  pass: process.env['MAILER_PASS'] || '',
  tls: true,
  rejectUnauthorized: true,
  domain: process.env['HOST'] || '',
  pool: false,
  maxConnections: 15, // if pool = true
  maxMessages: 1000, // if pool = true
};

export default class Mailer {
  #transporter?: Transporter;

  settings: MailerOptions;

  constructor(options = defaultOptions) {
    this.settings = { ...options };
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

  createTransport(force = true): Transporter {
    if (!force && this.#transporter) {
      return this.#transporter;
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

    this.#transporter = nodemailer.createTransport(options);

    return this.#transporter;
  }

  // eslint-disable-next-line class-methods-use-this
  #filterEmail(emails: string | string[], allowDisposable = false): string {
    if (Array.isArray(emails)) {
      return emails
        .filter((email) => {
          if (!isEmail(email)) {
            // TODO: log
            return false;
          }
          return allowDisposable ? true : !disposable(email);
        })
        .join(', ');
    }
    if (!isEmail(emails)) {
      // TODO: log
      return '';
    }
    if (allowDisposable) {
      return emails;
    }
    return disposable(emails) ? '' : emails;
  }

  send = (options: sendOptions): Promise<SendResult> => {
    const transporter = this.createTransport(false);
    const from = options.from
      ? `${options.from} <${this.settings.user}>`
      : this.settings.user;
    const to = this.#filterEmail(options.to, options.allowDisposable);
    const { subject, text, html, attachments, ...rest } = options;

    if (!to) throw new Error('EMAIL_REQUIRED');

    const mailOptions = {
      ...rest,
      from,
      to,
      subject,
      text,
      html,
      attachments,
    };

    if (!html) delete mailOptions.html;
    if (!(attachments && Array.isArray(attachments)))
      delete mailOptions.attachments;

    return transporter.sendMail(mailOptions as SendMailOptions);
  };
}
