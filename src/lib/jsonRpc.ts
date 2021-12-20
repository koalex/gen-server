/* eslint-disable consistent-return,no-return-assign */
import { KoaContext } from 'types/koa';
import { Context, Middleware } from 'koa';
import bodyParser from '../middlewares/bodyParser';

type ParamsType = Record<string, any> | any[] | void;

export type JsonRpcRequest<T = ParamsType> = {
  jsonrpc: '2.0';
  method: string;
  id?: number | string;
  params: T; // { [key: string]: any} // <T extends BaseParams>(arg: T) => T;
};

export type JsonRpcResponse<T = any> = {
  jsonrpc: '2.0';
  id: number | string | null;
  result: T;
};

type JsonRpcResponseError = {
  code: number;
  message: string;
  data?: any;
};

export type JsonRpcErrorResponse = {
  jsonrpc: '2.0';
  id: number | string | null;
  error: JsonRpcResponseError;
};

type Route = {
  method: string;
  handler: (
    jsonRpcRequest: JsonRpcRequest<any>,
    ctx?: Context | KoaContext,
    next?: () => Promise<any> | any,
  ) => Promise<any> | any;
};

export const preDefinedErrors = new Map([
  [-32700, 'Parse error'],
  [-32600, 'Invalid Request'],
  [-32601, 'Method not found'],
  [-32602, 'Invalid params'],
  [-32603, 'Internal error'],
  [-32000, 'Server error'],
]);

for (let i = 1; i < 100; i += 1) {
  preDefinedErrors.set(-32000 - i, 'Server error');
}

export function makeResponse(
  data: any,
  jsonRpcRequest: JsonRpcRequest<void>,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: jsonRpcRequest.id || null,
    result: data,
  };
}

function makeErrorForData(err: unknown): any {
  let result;
  // TODO: выводить детали ошибки (как в error middleware) & notify
  // @ts-ignore
  if (err && err.message) {
    // @ts-ignore
    result = { message: err.message };
  }

  return result;
}

export function makeError(
  jsonRpcRequest: JsonRpcRequest<void> | null,
  code: number,
  message?: string | null,
  data?: any,
): JsonRpcErrorResponse {
  const error: JsonRpcErrorResponse = {
    jsonrpc: '2.0',
    id:
      jsonRpcRequest &&
      (typeof jsonRpcRequest.id === 'number' ||
        typeof jsonRpcRequest.id === 'string')
        ? jsonRpcRequest.id
        : null,
    error: {
      code,
      message: preDefinedErrors.get(Number(code)) || message || 'error',
      data: data ? makeErrorForData(data) : undefined,
    },
  };

  if (data === undefined) delete error.error.data;

  return error;
}

function isNotFound(v: any) {
  return v && v['error'] && v['error']['code'] === -32601;
}

// eslint-disable-next-line consistent-return
function validateRequest(
  jsonRpcRequest: JsonRpcRequest<void>,
): JsonRpcErrorResponse | void {
  if (Object.prototype.toString.call(jsonRpcRequest) !== '[object Object]') {
    return makeError(null, -32600);
  }

  const jsonRpcRequestObject = jsonRpcRequest;

  if (jsonRpcRequestObject.jsonrpc !== '2.0') return makeError(null, -32600);
  if (typeof jsonRpcRequestObject.method !== 'string')
    return makeError(null, -32600);
  if (
    'id' in jsonRpcRequestObject &&
    typeof jsonRpcRequestObject.id !== 'string' &&
    typeof jsonRpcRequestObject.id !== 'number'
  ) {
    return makeError(null, -32600);
  }
  if (
    'params' in jsonRpcRequestObject &&
    !Array.isArray(jsonRpcRequestObject.params) &&
    Object.prototype.toString.call(jsonRpcRequestObject.params) !==
      '[object Object]'
  ) {
    return makeError(jsonRpcRequestObject, -32602);
  }
}

function responseObjectIsValid(
  jsonRpcResponse: JsonRpcResponse | JsonRpcErrorResponse,
  jsonRpcRequest: JsonRpcRequest<void>,
) {
  if (!jsonRpcResponse && jsonRpcRequest) return false;
  if (!jsonRpcRequest) return false;

  if (jsonRpcResponse) {
    if (Object.prototype.toString.call(jsonRpcResponse) !== '[object Object]')
      return false;
    if (jsonRpcResponse.jsonrpc !== '2.0') return false;
    if ('result' in jsonRpcResponse && 'error' in jsonRpcResponse) return false;
    if (!('result' in jsonRpcResponse) && !('error' in jsonRpcResponse))
      return false;
    if ('id' in jsonRpcResponse || 'id' in jsonRpcRequest) {
      if (jsonRpcResponse.id !== jsonRpcRequest.id) {
        return false;
      }
    }

    if ('error' in jsonRpcResponse) {
      if (
        Object.prototype.toString.call(jsonRpcResponse.error) !==
        '[object Object]'
      ) {
        return false;
      }

      if (typeof jsonRpcResponse.error.code !== 'number') return false;
      if (typeof jsonRpcResponse.error.message !== 'string') return false;

      if ('data' in jsonRpcResponse.error) {
        if (
          Object.prototype.toString.call(jsonRpcResponse.error.data) !==
            '[object Object]' &&
          !Array.isArray(jsonRpcResponse.error.data)
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

export class Router {
  base: string;

  jsonLimit: string;

  #routes: { [key: string]: Route } = {};

  #rawRoutes: Route[] = [];

  constructor(base = '/', routes: Route[] = [], jsonLimit = '1mb') {
    this.base = base;
    this.routes = routes;
    this.jsonLimit = jsonLimit;
  }

  set routes(v: Route[]) {
    this.#rawRoutes = v;
    this.#routes = {};
    if (!v.length) {
      return;
    }

    for (let i = 0; i < v.length; i += 1) {
      const route = v[i];
      this.#routes[route.method] = route;
    }
  }

  get routes() {
    return this.#rawRoutes;
  }

  execute =
    (): Middleware =>
    async (ctx, next): Promise<any> => {
      if (ctx.request.url !== this.base || ctx.method !== 'POST') {
        if (typeof next === 'function') await next();
        return;
      }

      let initialRouter = false;
      if (!ctx.state) {
        ctx.state = {};
      }

      if (!('jsonrpcResponces' in ctx.state)) {
        ctx.state['jsonrpcResponces'] = undefined;
        initialRouter = true;
      }

      if (!ctx.request.body) {
        let parseError: JsonRpcErrorResponse | null = null;

        const onerror = () => {
          parseError = makeError(null, -32700);
        };

        await bodyParser({ onerror, jsonLimit: this.jsonLimit })(
          ctx,
          async () => {},
        );

        if (parseError) {
          return (ctx.body = parseError);
        }
      }

      const jsonRpcRequest = ctx.request.body;

      if (
        Object.prototype.toString.call(jsonRpcRequest) === '[object Object]'
      ) {
        const validationError = validateRequest(jsonRpcRequest);
        if (validationError) return (ctx.body = validationError);
      }

      if (Array.isArray(jsonRpcRequest) && !jsonRpcRequest.length) {
        return (ctx.body = makeError(null, -32600));
      }

      ctx.status = 200;

      if (Array.isArray(jsonRpcRequest)) {
        const result: any[] = await Promise.allSettled(
          jsonRpcRequest.map((req) =>
            this.#handleJsonRpcRequest(req, ctx, next),
          ),
        );

        const response = result.reduce((acc, v, i) => {
          if (v.status === 'fulfilled' /* && v.value */) {
            const res: JsonRpcResponse | JsonRpcErrorResponse = v.value;
            acc.push(res);
          } else if (v.status === 'rejected') {
            const err = makeError(jsonRpcRequest[i], -32000, null, v.reason);
            acc.push(err);
          }

          return acc;
        }, []);
        if (!ctx.state['jsonrpcResponces']) {
          ctx.state['jsonrpcResponces'] = response;
        } else {
          for (let i = 0; i < response.length; i += 1) {
            if (
              ctx.state['jsonrpcResponces'][i] === undefined ||
              isNotFound(ctx.state['jsonrpcResponces'][i])
            ) {
              ctx.state['jsonrpcResponces'][i] = response[i];
            }
          }
        }
      } else if (
        ctx.state['jsonrpcResponces'] === undefined ||
        isNotFound(ctx.state['jsonrpcResponces'])
      ) {
        try {
          ctx.state['jsonrpcResponces'] = await this.#handleJsonRpcRequest(
            jsonRpcRequest,
            ctx,
            next,
          );
        } catch (err: unknown) {
          ctx.state['jsonrpcResponces'] = makeError(
            jsonRpcRequest,
            -32000,
            null,
            err,
          );
        }
      }

      if (typeof next === 'function') await next();

      if (initialRouter) {
        if (Array.isArray(ctx.state['jsonrpcResponces'])) {
          const response = ctx.state['jsonrpcResponces'].filter((v) => !!v);
          if (response.length) ctx.body = response;
        } else if (ctx.state['jsonrpcResponces']) {
          ctx.body = ctx.state['jsonrpcResponces'];
        }

        ctx.state['jsonrpcResponces'] = null;
      }
    };

  #handleJsonRpcRequest = async (
    jsonRpcRequest: JsonRpcRequest<void>,
    ctx: Context | KoaContext,
    next: () => Promise<any> | any,
  ): Promise<JsonRpcResponse | JsonRpcErrorResponse | void | null> => {
    const validationError = validateRequest(jsonRpcRequest);
    if (validationError) return validationError;

    if (!this.#routes[jsonRpcRequest.method]) {
      if ('id' in jsonRpcRequest) return makeError(jsonRpcRequest, -32601);
      return; // TODO: log метод для нотификации не найден
    }

    const { handler } = this.#routes[jsonRpcRequest.method];

    if (typeof handler !== 'function') {
      return makeError(jsonRpcRequest, -32000);
    }

    const result = await handler(jsonRpcRequest, ctx, next);

    if (jsonRpcRequest.id) {
      if (responseObjectIsValid(result, jsonRpcRequest)) {
        return result;
      }

      const response = makeResponse(result, jsonRpcRequest);
      if (!responseObjectIsValid(response, jsonRpcRequest)) {
        return makeError(jsonRpcRequest, -32603);
      }
      return response;
    }
    return null;
  };
}
