'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = require('path');
// @ts-ignore
const nodemon_1 = __importDefault(require('nodemon/lib/nodemon'));
const chalk_1 = __importDefault(require('chalk'));
const watch = [(0, path_1.join)(__dirname, '../')];
const ignore = [
  'node_modules',
  'test/*',
  '.idea',
  '.git',
  'temp/*',
  'coverage/*',
  'nodemon.ts',
];
(0, nodemon_1.default)({
  script: (0, path_1.join)(__dirname, 'index.ts'),
  delay: 500,
  watch,
  ignore,
  ext: 'ts,json',
});
nodemon_1.default
  .once('start', () => {
    console.info(chalk_1.default.blue.bgGreen.bold('nodemon started'));
  })
  .on('restart', (files) => {
    console.info(
      chalk_1.default.blue.bgGreen.bold('next files are changed:'),
      files,
    );
    console.info(chalk_1.default.blue.bgGreen.bold('restarting...'));
  });
//# sourceMappingURL=nodemon.js.map
