const path    = require('path');
const nodemon = require('nodemon');

const watch  = [path.join(__dirname, '../')];
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
    delay: 2500,
    script: __dirname + '/server.js',
    watch,
    ignore
});