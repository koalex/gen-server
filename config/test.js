export default {
  port: 3000,
  origins: [
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://127.0.0.1:8080',
    'http://127.0.0.1:9000',
    'https://127.0.0.1:9000',
    'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:9000',
    'https://localhost:3000',
    'https://localhost:8080',
    'https://localhost:9000'
  ],
  keys: ['test1', 'test2'],
  secret: 'someStrWithLowerAndUpperCase'
};
