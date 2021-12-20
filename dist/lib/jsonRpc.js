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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _Router_routes, _Router_rawRoutes, _Router_handleJsonRpcRequest;
Object.defineProperty(exports, '__esModule', { value: true });
exports.Router =
  exports.makeError =
  exports.makeResponse =
  exports.preDefinedErrors =
    void 0;
const bodyParser_1 = __importDefault(require('../middlewares/bodyParser'));
exports.preDefinedErrors = new Map([
  [-32700, 'Parse error'],
  [-32600, 'Invalid Request'],
  [-32601, 'Method not found'],
  [-32602, 'Invalid params'],
  [-32603, 'Internal error'],
  [-32000, 'Server error'],
]);
for (let i = 1; i < 100; i += 1) {
  exports.preDefinedErrors.set(-32000 - i, 'Server error');
}
function makeResponse(data, jsonRpcRequest) {
  return {
    jsonrpc: '2.0',
    id: jsonRpcRequest.id || null,
    result: data,
  };
}
exports.makeResponse = makeResponse;
function makeErrorForData(err) {
  let result;
  // TODO: выводить детали ошибки (как в error middleware) & notify
  // @ts-ignore
  if (err && err.message) {
    // @ts-ignore
    result = { message: err.message };
  }
  return result;
}
function makeError(jsonRpcRequest, code, message, data) {
  const error = {
    jsonrpc: '2.0',
    id:
      jsonRpcRequest &&
      (typeof jsonRpcRequest.id === 'number' ||
        typeof jsonRpcRequest.id === 'string')
        ? jsonRpcRequest.id
        : null,
    error: {
      code,
      message: exports.preDefinedErrors.get(Number(code)) || message || 'error',
      data: data ? makeErrorForData(data) : undefined,
    },
  };
  if (data === undefined) delete error.error.data;
  return error;
}
exports.makeError = makeError;
function isNotFound(v) {
  return v && v['error'] && v['error']['code'] === -32601;
}
// eslint-disable-next-line consistent-return
function validateRequest(jsonRpcRequest) {
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
function responseObjectIsValid(jsonRpcResponse, jsonRpcRequest) {
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
class Router {
  constructor(base = '/', routes = [], jsonLimit = '1mb') {
    _Router_routes.set(this, {});
    _Router_rawRoutes.set(this, []);
    this.execute = () => (ctx, next) =>
      __awaiter(this, void 0, void 0, function* () {
        if (ctx.request.url !== this.base || ctx.method !== 'POST') {
          if (typeof next === 'function') yield next();
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
          let parseError = null;
          const onerror = () => {
            parseError = makeError(null, -32700);
          };
          yield (0, bodyParser_1.default)({
            onerror,
            jsonLimit: this.jsonLimit,
          })(ctx, () => __awaiter(this, void 0, void 0, function* () {}));
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
          const result = yield Promise.allSettled(
            jsonRpcRequest.map((req) =>
              __classPrivateFieldGet(
                this,
                _Router_handleJsonRpcRequest,
                'f',
              ).call(this, req, ctx, next),
            ),
          );
          const response = result.reduce((acc, v, i) => {
            if (v.status === 'fulfilled' /* && v.value */) {
              const res = v.value;
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
            ctx.state['jsonrpcResponces'] = yield __classPrivateFieldGet(
              this,
              _Router_handleJsonRpcRequest,
              'f',
            ).call(this, jsonRpcRequest, ctx, next);
          } catch (err) {
            ctx.state['jsonrpcResponces'] = makeError(
              jsonRpcRequest,
              -32000,
              null,
              err,
            );
          }
        }
        if (typeof next === 'function') yield next();
        if (initialRouter) {
          if (Array.isArray(ctx.state['jsonrpcResponces'])) {
            const response = ctx.state['jsonrpcResponces'].filter((v) => !!v);
            if (response.length) ctx.body = response;
          } else if (ctx.state['jsonrpcResponces']) {
            ctx.body = ctx.state['jsonrpcResponces'];
          }
          ctx.state['jsonrpcResponces'] = null;
        }
      });
    _Router_handleJsonRpcRequest.set(this, (jsonRpcRequest, ctx, next) =>
      __awaiter(this, void 0, void 0, function* () {
        const validationError = validateRequest(jsonRpcRequest);
        if (validationError) return validationError;
        if (
          !__classPrivateFieldGet(this, _Router_routes, 'f')[
            jsonRpcRequest.method
          ]
        ) {
          if ('id' in jsonRpcRequest) return makeError(jsonRpcRequest, -32601);
          return; // TODO: log метод для нотификации не найден
        }
        const { handler } = __classPrivateFieldGet(this, _Router_routes, 'f')[
          jsonRpcRequest.method
        ];
        if (typeof handler !== 'function') {
          return makeError(jsonRpcRequest, -32000);
        }
        const result = yield handler(jsonRpcRequest, ctx, next);
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
      }),
    );
    this.base = base;
    this.routes = routes;
    this.jsonLimit = jsonLimit;
  }
  set routes(v) {
    __classPrivateFieldSet(this, _Router_rawRoutes, v, 'f');
    __classPrivateFieldSet(this, _Router_routes, {}, 'f');
    if (!v.length) {
      return;
    }
    for (let i = 0; i < v.length; i += 1) {
      const route = v[i];
      __classPrivateFieldGet(this, _Router_routes, 'f')[route.method] = route;
    }
  }
  get routes() {
    return __classPrivateFieldGet(this, _Router_rawRoutes, 'f');
  }
}
exports.Router = Router;
(_Router_routes = new WeakMap()),
  (_Router_rawRoutes = new WeakMap()),
  (_Router_handleJsonRpcRequest = new WeakMap());
//# sourceMappingURL=jsonRpc.js.map
