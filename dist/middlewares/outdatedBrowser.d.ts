import { KoaContext } from 'types/koa';
declare type OutdatedOpts = {
    IE?: number;
};
export default function OutdatedBrowser(opts?: OutdatedOpts): (ctx: KoaContext, next: () => Promise<any>) => Promise<void>;
export {};
//# sourceMappingURL=outdatedBrowser.d.ts.map