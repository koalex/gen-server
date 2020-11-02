import 'trace';
import 'clarify';
import chain from 'stack-chain';

export default function() {
  Error.stackTraceLimit = 1000;

  chain.filter.attach((err, frames) => {
    return frames.filter(callSite => {
      const name = callSite && callSite.getFileName();
      return (name && name.indexOf('/koa-') === -1 && name.indexOf('/koa/') === -1);
    });
  });
};
