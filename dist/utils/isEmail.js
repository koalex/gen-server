'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function isEmail(val) {
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    val,
  );
}
exports.default = isEmail;
//# sourceMappingURL=isEmail.js.map
