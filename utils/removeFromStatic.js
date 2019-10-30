const path     = require('path');
const rimraf   = require('rimraf');
const notifier = require('node-notifier');
const dest     = path.join(__dirname, '../static');

module.exports = function (paths) {
    if (Array.isArray(paths)) {
        paths.forEach(source => {
            try {
                rimraf.sync(path.join(dest, path.basename(source)));
            } catch (err) {
                if (__DEV__) {
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
    } else if ('string' == typeof paths) {
        try {
            rimraf.sync(path.join(dest, path.basename(paths)));
        } catch (err) {
            if (__DEV__) {
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
