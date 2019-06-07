const os       = require('os');
const path     = require('path');
const ncp      = require('ncp').ncp;
const notifier = require('node-notifier');
const mkdirp   = require('mkdirp');

ncp.limit = 16;

module.exports = function (paths, to) {
    let dest = path.join(__dirname, '../static');
    let promises = [];
    if (to) {
        dest = path.join(dest, to);
        mkdirp.sync(dest);
    }
    if (Array.isArray(paths)) {
        paths.forEach(source => {
            promises.push(new Promise((resolve, reject) => {
                ncp(source, path.join(dest, path.basename(source)), { clobber: !global.__DEV__ }, err => {
                    if (err) {
                        if (global.__DEV__) {
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
            ncp(paths, path.join(dest, path.basename(paths)), { clobber: !global.__DEV__ }, err => {
                if (err) {
                    if (global.__DEV__) {
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
