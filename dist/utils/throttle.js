'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function throttle(func, ms) {
  let isThrottled = false,
    savedArgs,
    savedThis;
  function wrapper(...args) {
    if (isThrottled) {
      savedArgs = args;
      // @ts-ignore
      savedThis = this;
      return;
    }
    // @ts-ignore
    func.apply(this, arguments);
    isThrottled = true;
    setTimeout(function () {
      isThrottled = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        // @ts-ignore
        savedArgs = savedThis = null;
      }
    }, ms);
  }
  return wrapper;
}
exports.default = throttle;
//# sourceMappingURL=throttle.js.map
