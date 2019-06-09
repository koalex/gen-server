const path       = require('path');
const nodemon    = require('nodemon');
const ignoreRoot = require('ignore-by-default').directories().filter(dir => !dir.includes('node_modules')); // nodemaon has this dependency

const watch  = [path.join(__dirname, '../')];
const ignore = [
    // 'node_modules', // if set this process.env.MODULES does not work
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
    process.env.MODULES.split(/\s{0,},\s{0,}/).forEach(m => {
        const modulePath = path.join(__dirname, '../node_modules', m);
        watch.push(modulePath);
    });
}

nodemon({
    script: __dirname + '/server.js',
    watch,
    ignore,
    ignoreRoot
});