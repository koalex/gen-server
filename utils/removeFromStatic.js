import { basename, join } from 'path';
import rimraf from 'rimraf';
import notifier from 'node-notifier';
import esDirname from './dirname.js';

const dest = join(esDirname(import.meta), '../static');

export default function(paths) {
  if (Array.isArray(paths)) {
    paths.forEach(source => {
      try {
        rimraf.sync(join(dest, basename(source)));
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          notifier.notify({
            title: 'NODE.js: removeFromStatic Error',
            message: err.message,
            sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
            wait: true
          });
        } else {
          throw err;
        }
      }
    });
  } else if ('string' === typeof paths) {
    try {
      rimraf.sync(join(dest, basename(paths)));
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        notifier.notify({
          title: 'NODE.js: removeFromStatic Error',
          message: err.message,
          sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
          wait: true
        });
      } else {
        throw err;
      }
    }
  } else {
    throw new Error('"paths" must be a string or array of strings.');
  }
};
