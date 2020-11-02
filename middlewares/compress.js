import compress from 'koa-compress';
import { Z_SYNC_FLUSH } from 'zlib';

export default compress({
  filter: function(content_type) {
    return /text/i.test(content_type) || /json/i.test(content_type) || /svg/i.test(content_type);
  },
  threshold: 1024, // if response size < threshold, then no compress...
  flush: Z_SYNC_FLUSH
});
