import { KoaContext } from 'types/koa';
import { Context, Middleware } from 'koa';
declare type ParamsType = Record<string, any> | any[] | void;
export declare type JsonRpcRequest<T = ParamsType> = {
    jsonrpc: '2.0';
    method: string;
    id?: number | string;
    params: T;
};
export declare type JsonRpcResponse<T = any> = {
    jsonrpc: '2.0';
    id: number | string | null;
    result: T;
};
declare type JsonRpcResponseError = {
    code: number;
    message: string;
    data?: any;
};
export declare type JsonRpcErrorResponse = {
    jsonrpc: '2.0';
    id: number | string | null;
    error: JsonRpcResponseError;
};
declare type Route = {
    method: string;
    handler: (jsonRpcRequest: JsonRpcRequest<any>, ctx?: Context | KoaContext, next?: () => Promise<any> | any) => Promise<any> | any;
};
export declare const preDefinedErrors: Map<number, string>;
export declare function makeResponse(data: any, jsonRpcRequest: JsonRpcRequest<void>): JsonRpcResponse;
export declare function makeError(jsonRpcRequest: JsonRpcRequest<void> | null, code: number, message?: string | null, data?: any): JsonRpcErrorResponse;
export declare class Router {
    #private;
    base: string;
    jsonLimit: string;
    constructor(base?: string, routes?: Route[], jsonLimit?: string);
    set routes(v: Route[]);
    get routes(): Route[];
    execute: () => Middleware;
}
export {};
//# sourceMappingURL=jsonRpc.d.ts.map