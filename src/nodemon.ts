import { join } from 'path';
// @ts-ignore
import nodemon from 'nodemon/lib/nodemon';
import chalk from 'chalk';

const watch = [join(__dirname, '../')];
const ignore = [
  'node_modules',
  'test/*',
  '.idea',
  '.git',
  'temp/*',
  'coverage/*',
  'nodemon.ts',
];

nodemon({
  script: join(__dirname, 'index.ts'),
  delay: 500,
  watch,
  ignore,
  ext: 'ts,json',
});

nodemon
  .once('start', () => {
    console.info(chalk.blue.bgGreen.bold('nodemon started'));
  })
  .on('restart', (files: string[]) => {
    console.info(chalk.blue.bgGreen.bold('next files are changed:'), files);
    console.info(chalk.blue.bgGreen.bold('restarting...'));
  });
