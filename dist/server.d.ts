/// <reference types="node" />
import { Server as HttpServer } from 'http';
import { Http2SecureServer } from 'http2';
import { Context, Middleware } from 'koa';
import koaHelmet from 'koa-helmet';
import { UserAgentContext } from 'koa-useragent';
import { MiddlewareOptions as RateLimitOptions } from 'koa-ratelimit';
import I18n from 'koa-i18n';
import Logger from 'bunyan';
declare type HelmetOptions = Required<Parameters<typeof koaHelmet>>[0];
declare type Options = {
    port: number;
    protocol?: 'http' | 'https' | 'http2' | 'http/2';
    ws?: boolean;
    origins?: string[];
    proxy?: boolean;
    sslKey?: string;
    sslCert?: string;
    keys?: string[];
    helmet?: HelmetOptions;
    createPidFile?: boolean;
    pidFilePath?: string;
    rateLimit?: RateLimitOptions;
    staticPath?: string;
};
interface BaseUser {
    id?: string | number;
    _id?: string | number;
}
interface State {
    user?: BaseUser;
}
export interface KoaContext extends Context, UserAgentContext {
    compress?: boolean;
    state: State;
    log: Logger;
    render: (templatePathOrTemplateString: string, locals: any) => string;
    i18n: I18n;
    getLocaleFromQuery: () => string;
    getLocaleFromCookie: () => string;
    getLocaleFromSubdomain: () => string;
    getLocaleFromHeader: () => string;
    getLocaleFromUrl: () => string;
    getLocaleFromTLD: () => string;
}
declare class Server {
    #private;
    port: number;
    protocol: 'http' | 'https' | 'http2' | 'http/2';
    ws: boolean;
    origins?: string[];
    proxy: boolean;
    sslKey?: string;
    sslCert?: string;
    keys: string[];
    helmet?: HelmetOptions;
    createPidFile: boolean;
    pidFilePath: string;
    rateLimit?: RateLimitOptions;
    staticPath?: string;
    constructor({ port, protocol, ws, origins, proxy, sslKey, sslCert, keys, helmet, createPidFile, pidFilePath, rateLimit, staticPath, }: Options);
    get instance(): HttpServer | Http2SecureServer | null;
    get app(): any;
    get log(): Logger;
    use: (middleware: Middleware) => void;
    start: (callback?: (() => void) | undefined) => void;
    stop: (callback?: ((err?: Error | undefined) => void) | undefined) => void;
}
export default Server;
//# sourceMappingURL=server.d.ts.map