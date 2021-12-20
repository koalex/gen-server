import { Transporter } from 'nodemailer';
declare type MailerOptions = {
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
declare type sendOptions = {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: unknown;
    allowDisposable: boolean;
};
declare type SendResult = {
    messageId: number;
    accepted: string[];
    rejected: string[];
};
export default class Mailer {
    #private;
    settings: MailerOptions;
    constructor(options?: MailerOptions);
    createTransport(force?: boolean): Transporter;
    send: (options: sendOptions) => Promise<SendResult>;
}
export {};
//# sourceMappingURL=nodemailer.d.ts.map