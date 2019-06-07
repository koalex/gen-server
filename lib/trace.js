'use strict';

module.exports = () => {
    Error.stackTraceLimit = 1000;
    require('trace');
    require('clarify');

    let chain = require('stack-chain');

    chain.filter.attach((err, frames) => {
        return frames.filter(callSite => {
            let name = callSite && callSite.getFileName();
            return (name && name.indexOf('/koa-') == -1 && name.indexOf('/koa/') == -1);
        });
    });
};
