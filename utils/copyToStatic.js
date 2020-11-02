import os from 'os';
import { basename,join } from 'path';
import { ncp } from 'ncp'
import notifier from 'node-notifier';
import mkdirp from 'mkdirp';
import esDirname from './dirname.js';

ncp.limit = 16;

export default function(paths, to) {
  let dest = join(esDirname(import.meta), '../static');
  let promises = [];
  if (to) {
    dest = join(dest, to);
    mkdirp.sync(dest);
  }
  if (Array.isArray(paths)) {
    paths.forEach(source => {
      promises.push(new Promise((resolve, reject) => {
        ncp(source, join(dest, basename(source)), { clobber: process.env.NODE_ENV !== 'development' }, err => {
          if (err) {
            if (process.env.NODE_ENV === 'development') {
              notifier.notify({
                title: 'NODE.js: copyToStatic Error',
                message: err.message || err.code,
                sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
                wait: true
              });
            }
            reject(err);
          } else {
            resolve();
          }
        });
      }));
    });
    return Promise.all(promises);
  } else if ('string' === typeof paths) {
    return new Promise((resolve, reject) => {
      ncp(paths, join(dest, basename(paths)), { clobber: process.env.NODE_ENV !== 'development' }, err => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            notifier.notify({
              title: 'NODE.js: copyToStatic Error',
              message: err.message || err.code,
              sound: ('DARWIN' === os.type().toUpperCase()) ? 'Blow' : true,
              wait: true
            });
          }
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } else {
    throw new Error('"paths" must be a string or array of strings.');
  }
};
