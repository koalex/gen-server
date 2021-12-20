# Gen-Server

### В проекте используется:

-   [`ESLint`](https://eslint.org/) для линтинга кода, используется свой styleguide основанный на [`airbnb`](https://github.com/airbnb/javascript) стандарте.
-   [`prettier`](https://prettier.io/) для форматирования кода.
-   [`husky`](https://github.com/typicode/husky) для запуска `git`-хуков.
-   [`mocha`](https://jestjs.io/) для написания тестов.
-   [`Conventional Commits`](https://www.conventionalcommits.org) Styleguide для коммитов.
-   [`Release It`](https://github.com/release-it/release-it) для выпуска релизов и автогенерации `CHANGELOG.md`

Так же в проекте есть настроенные lib-ы redis, mongoose, nodemailer.
Чтобы пользоваться ими нужно установить переменные окружения (см. [.env](.env)).

### Пример использования
```typescript
import { readFileSync } from 'fs';
import { Server, jsonRpc, Socket, KoaContext } from 'gen-server';
import { Context } from 'koa';

const { Router, makeResponse, makeError, JsonRpcRequest } = jsonRpc;

const server = new Server({
  port: 3000,
  protocol: 'https', // По умолчанию http
  ws: true, // Использовать websocket, по умолчанию false
  origins: ['https://site.com', 'https://localhost'],
  proxy: true, // Если приложение стоит, например за NGINX. По умолчанию false
  sslKey: readFileSync('/root/key.pem'), // Нужно только если protocol не равен http
  sslCert: readFileSync('/root/cert.pem'), // Нужно только если protocol не равен http
  keys: ['secret 1', 'secret 2'], // Ключи для подписи cookies
  helmet: { contentSecurityPolicy: false }, // Настройки middleware-а koa-helmet
  createPidFile: true, // Нужно ли создавать файл с id процесса, по умолчанию false
  pidFilePath: process.cwd() + '/process.pid', // Куда записывать pid-файл. Не нужно если createPidFile = true. По умолчанию = process.cwd() + '/process.pid'
  rateLimit: { // Настройки middleware-а koa-ratelimit. Необязательно, эти настройки будут по умолчанию.
    driver: 'memory',
    db: new Map(),
    duration: 60000,
    id: (ctx: Context) => ctx.ip,
    throw: true,
    headers: {
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset',
      total: 'X-Rate-Limit-Total',
    },
    disableHeader: false,
    max: 35000,
  },
  staticPath: '/var/www/assets', // Если нужно чтобы Node.js отдавал статику
});

const router = new Router('/api', [
  {
    method: 'ping.pong',
    handler: (jsonRpcRequest: JsonRpcRequest<number[]>, ctx: KoaContext) => {
      const { params } = jsonRpcRequest;
      Socket.io.emit('jsonrpc', makeResponse(params, jsonRpcRequest)); // Будет работать только если сервер с опцией ws = true
      return params;
    },
  },
  {
    method: 'error.method',
    handler: (jsonRpcRequest: JsonRpcRequest<string[]>, ctx: KoaContext) => {
      return makeError(jsonRpcRequest, 777, 'Сообщение ошибки.');
    }
  },
]);

server.use(router.execute());

server.start();
```

### Команды

Запуск nodemon в `development` режиме:
```bash
npm start
```

Сборка в папку `build`:
```bash
npm run build
```

Запуск `eslint` и `prettier` с фиксами ошибок (только для staged-файлов):
```bash
npm run lint-staged
```

Запуск тестов:
```bash
npm test
```

Создание коммит на основе `Conventional Commits`:
```bash
npm run commit
```

Выпуск релиза.<br>В [.env](.env) нужно **обязательно** установить переменную `GITHUB_TOKEN`) с токеном для github-а.
Подробнее про выкладки релизов на github можно почитать [здесь](https://docs.github.com/en/free-pro-team@latest/github/administering-a-repository/about-releases)
```bash
release:patch` `release:minor` `release:major
```

### Рекомендуется к прочтению:
[Components naming conventional](https://medium.com/@wittydeveloper/react-components-naming-convention-%EF%B8%8F-b50303551505)
