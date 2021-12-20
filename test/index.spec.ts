import assert from 'assert';
import { join } from 'path';
import Server from '../src/server';
import { Router as JsonRpcRouter, JsonRpcRequest } from '../src/lib/jsonRpc';
import supertest, { Response } from 'supertest';
import { io, Socket } from 'socket.io-client';

const PORT: number = process.env['PORT'] ? +process.env['PORT'] : 3003;
// @ts-ignore
const PROTOCOL: 'https' | 'http2' | 'http/2' | 'http' =
  process.env['PROTOCOL'] || 'http';

let secure = false;
if (['https', 'http2', 'http/2'].some((protocol) => PROTOCOL === protocol)) {
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  secure = true;
}

const server = new Server({
  port: PORT,
  protocol: PROTOCOL,
  ws: true,
  staticPath: join(__dirname, '../src/assets'),
});

type SubtractParams = {
  subtrahend: number;
  minuend: number;
};

server.use(
  new JsonRpcRouter('/api', [
    {
      method: 'subtract',
      handler: ({
        params,
      }: JsonRpcRequest<SubtractParams> | JsonRpcRequest<number[]>) => {
        let result;
        if (Array.isArray(params)) {
          result = params[0] - params[1];
        } else {
          result = params.minuend - params.subtrahend;
        }

        return result;
      },
    },
    {
      method: 'update', // notification
      handler: () => {},
    },
    {
      method: 'get_data',
      handler: () => ['hello', 5],
    },
  ]).execute(),
);

server.use(
  new JsonRpcRouter('/api', [
    {
      method: 'notify_sum', // notification
      handler: () => {},
    },
    {
      method: 'notify_hello', // notification
      handler: () => {},
    },
    {
      method: 'sum',
      handler: ({ params }: JsonRpcRequest<number[]>) => {
        let result;
        if (params) {
          result = params.reduce((sum: number, num: number) => sum + num, 0);
        }

        return result;
      },
    },
  ]).execute(),
);

const ioOptions = {
  path: '/websocket',
  secure,
  rejectUnauthorized: false,
  transports: ['websocket'],
  forceNew: true,
  reconnection: false,
  transportOptions: {
    websocket: {
      extraHeaders: {
        origin: 'test',
      },
    },
  },
};

let request: any;
let sender: Socket | undefined;
let receiver: Socket | undefined;

describe('GEN SERVER', () => {
  before((done) => {
    server.start(() => {
      request = supertest(server.instance);
      done();
    });
  });

  after((done) => {
    server.stop(done);
  });

  beforeEach((done) => {
    sender = io(
      `${PROTOCOL === 'http' ? 'http' : 'https'}://localhost:${PORT}`,
      ioOptions,
    );
    receiver = io(
      `${PROTOCOL === 'http' ? 'http' : 'https'}://localhost:${PORT}`,
      ioOptions,
    );
    done();
  });

  afterEach((done) => {
    if (sender) sender.disconnect();
    if (receiver) receiver.disconnect();
    done();
  });

  describe('SMOKE test #server startup', () => {
    it('should return the bound address, the address family name, and port of the server as reported by the operating system if listening on an IP socket', (done) => {
      const address: any =
        server && server.instance ? server.instance.address() : {};
      let err;
      if (!['address', 'family', 'port'].every((key) => key in address)) {
        err = new Error('server does not start');
      }

      done(err);
    });
  });

  describe('SMOKE test #static server', () => {
    // eslint-disable-next-line func-names
    it('should return status 200 for request /robots.txt', function (done) {
      this.slow(200);
      request.get('/robots.txt').expect(200).end(done);
    });
  });

  describe('SMOKE test #SOCKET.io', () => {
    it('Clients should receive a message when the `message` event is emited.', (done) => {
      const testMessage = 'Hello World';
      if (sender) sender.emit('__TEST__', testMessage);
      if (receiver) {
        receiver.on('__TEST__', (message: string) => {
          assert.strictEqual(message, testMessage);
          done();
        });
      }
    });
  });

  describe('Outdated browser', () => {
    // eslint-disable-next-line func-names
    it('should render RU "Not Supported Browser" page with Accept-Language header', function (done) {
      this.slow(1000); // render w/o cache
      request
        .get('/__test_outdated_browser__.html')
        .set(
          'Accept-Language',
          'ru-RU,ru;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,zh-CN;q=0.5',
        )
        .set(
          'User-Agent',
          'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
        )
        .expect('Content-Type', /html/)
        .expect(200)
        .expect((response: Response) => {
          assert.strictEqual(
            true,
            response.text.includes('браузер не поддерживается'),
          );
        })
        .end(done);
    });

    it('should render RU "Not Supported Browser" page with ?locale=ru param', (done) => {
      request
        .get('/__test_outdated_browser__.html?locale=ru')
        .expect('Content-Type', /html/)
        .set(
          'User-Agent',
          'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
        )
        .expect(200)
        .expect((response: Response) => {
          assert.strictEqual(
            true,
            response.text.includes('браузер не поддерживается'),
          );
        })
        .end(done);
    });

    // eslint-disable-next-line func-names
    it('should render EN "Not Supported Browser" page with Accept-Language header', function (done) {
      this.slow(1000); // render w/o cache
      request
        .get('/__test_outdated_browser__.html')
        .set(
          'Accept-Language',
          'en-US,en;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,zh-CN;q=0.5',
        )
        .set(
          'User-Agent',
          'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
        )
        .expect('Content-Type', /html/)
        .expect(200)
        .expect((response: Response) => {
          assert.strictEqual(
            true,
            response.text.includes('browser is not supported'),
          );
        })
        .end(done);
    });

    it('should render EN "Not Supported Browser" page with ?locale=en param', (done) => {
      request
        .get('/__test_outdated_browser__.html?locale=en')
        .expect('Content-Type', /html/)
        .set(
          'User-Agent',
          'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
        )
        .expect(200)
        .expect((response: Response) => {
          assert.strictEqual(
            true,
            response.text.includes('browser is not supported'),
          );
        })
        .end(done);
    });
  });

  describe('JSON-RPC 2.0', () => {
    it('should return 19 (positional parameters)', (done) => {
      request
        .post('/api')
        .send({ jsonrpc: '2.0', method: 'subtract', params: [42, 23], id: 1 })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            id: 1,
            result: 19,
          });
        })
        .end(done);
    });

    it('should return -19 (positional parameters)', (done) => {
      request
        .post('/api')
        .send({ jsonrpc: '2.0', method: 'subtract', params: [23, 42], id: 2 })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            id: 2,
            result: -19,
          });
        })
        .end(done);
    });

    it('should return 19 (named parameters)', (done) => {
      request
        .post('/api')
        .send({
          jsonrpc: '2.0',
          method: 'subtract',
          params: { subtrahend: 23, minuend: 42 },
          id: 3,
        })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            id: 3,
            result: 19,
          });
        })
        .end(done);
    });

    it('should return status 200 w/o body #1', (done) => {
      request
        .post('/api')
        .send({ jsonrpc: '2.0', method: 'update', params: [1, 2, 3, 4, 5] })
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {});
          assert.strictEqual(res.text, 'OK');
        })
        .end(done);
    });

    it('should return status 200 w/o body #2', (done) => {
      request
        .post('/api')
        .send({ jsonrpc: '2.0', method: 'foobar' })
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {});
          assert.strictEqual(res.text, 'OK');
        })
        .end(done);
    });

    it('should return "Parse error"', (done) => {
      request
        .post('/api')
        .send('{"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]')
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
            id: null,
          });
        })
        .end(done);
    });

    it('should return "Invalid Request"', (done) => {
      request
        .post('/api')
        .send({ jsonrpc: '2.0', method: 1, params: 'bar' })
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id: null,
          });
        })
        .end(done);
    });

    it('should return "Parse error" for batch', (done) => {
      request
        .post('/api')
        .send(
          `[{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},{"jsonrpc": "2.0", "method"]`,
        )
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
            id: null,
          });
        })
        .end(done);
    });

    it('should return "Invalid Request" for empty array', (done) => {
      request
        .post('/api')
        .send([])
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id: null,
          });
        })
        .end(done);
    });

    it('should return "Invalid Request" for invalid batch #1', (done) => {
      request
        .post('/api')
        .send([1])
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, [
            {
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request' },
              id: null,
            },
          ]);
        })
        .end(done);
    });

    it('should return "Invalid Request" for invalid batch #2', (done) => {
      request
        .post('/api')
        .send([1, 2, 3])
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, [
            {
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request' },
              id: null,
            },
            {
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request' },
              id: null,
            },
            {
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request' },
              id: null,
            },
          ]);
        })
        .end(done);
    });

    it('should return status 200 w/o body for batch notifications', (done) => {
      request
        .post('/api')
        .send([
          { jsonrpc: '2.0', method: 'notify_sum', params: [1, 2, 4] },
          { jsonrpc: '2.0', method: 'notify_hello', params: [7] },
        ])
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, {});
          assert.strictEqual(res.text, 'OK');
        })
        .end(done);
    });

    it('should return mixed values', (done) => {
      request
        .post('/api')
        .send([
          { jsonrpc: '2.0', method: 'sum', params: [1, 2, 4], id: '1' },
          { jsonrpc: '2.0', method: 'notify_hello', params: [7] },
          { jsonrpc: '2.0', method: 'subtract', params: [42, 23], id: '2' },
          { foo: 'boo' },
          {
            jsonrpc: '2.0',
            method: 'foo.get',
            params: { name: 'myself' },
            id: '5',
          },
          { jsonrpc: '2.0', method: 'get_data', id: '9' },
        ])
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect((res: Response) => {
          assert.deepStrictEqual(res.body, [
            { jsonrpc: '2.0', result: 7, id: '1' },
            { jsonrpc: '2.0', result: 19, id: '2' },
            {
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request' },
              id: null,
            },
            {
              jsonrpc: '2.0',
              error: { code: -32601, message: 'Method not found' },
              id: '5',
            },
            { jsonrpc: '2.0', result: ['hello', 5], id: '9' },
          ]);
        })
        .end(done);
    });
  });
});
