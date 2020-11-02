import { join } from 'path';
import nodemon from 'nodemon';
import esDirname from '../utils/dirname.js';

const watch  = [join(esDirname(import.meta), '../')];
const ignore = [
  'node_modules',
  'nodemon.js',
  'test/*',
  'static/*',
  '.idea',
  '.git',
  'logs/*',
  'temp/*',
  'data/*',
  'coverage/*',
  'i18n/data/*.json'
];

if (process.env.MODULES) {
  process.env.MODULES.split(/\s{0,},\s{0,}/).forEach(m => watch.push(m));
}

nodemon({
  delay: 500,
  script: esDirname(import.meta) + '/server.js',
  watch,
  ignore,
});
