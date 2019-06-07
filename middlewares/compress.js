'use strict';

const compress = require('koa-compress');

module.exports = compress({
    filter: function (content_type) {
        return /text/i.test(content_type) || /json/i.test(content_type) || /svg/i.test(content_type);
    },
    threshold: 1024, // if response size < threshold, then no compress...
    flush: require('zlib').Z_SYNC_FLUSH
});
