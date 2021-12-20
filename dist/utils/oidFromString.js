'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const mongoose_1 = require('mongoose');
const { ObjectId } = mongoose_1.Types;
function oidFromString(str) {
  if ('' === str) throw new Error('Empty string.');
  const hashedStr = hashCode(str) + '';
  return new ObjectId(hexEncode(hashedStr).slice(0, 24));
}
exports.default = oidFromString;
function hexEncode(str) {
  let hex, i;
  let result = '';
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += ('000' + hex).slice(-4);
  }
  return result;
}
function hashCode(str) {
  let hash = 0,
    i,
    chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
//# sourceMappingURL=oidFromString.js.map
