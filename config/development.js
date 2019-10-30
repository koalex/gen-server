'use strict';

module.exports = {
    keys: ['qwerty1', 'qwerty2'],
    secret: 'someStrWithLowerAndUpperCase',
    origins: [
        'https://localhost',
        'https://localhost:443',
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:9000',
        'https://localhost:3000',
        'https://localhost:8080',
        'https://localhost:9000'
    ].concat(process.env.ORIGINS ? process.env.ORIGINS.split(/\s{0,},\s{0,}/) : []).concat(
        process.env.ORIGIN || []
    )
};
