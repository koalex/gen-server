'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function debounce(f, ms) {
  let timer = null;
  return function (...args) {
    const onComplete = () => {
      // @ts-ignore
      f.apply(this, args);
      timer = null;
    };
    if (timer) clearTimeout(timer);
    timer = setTimeout(onComplete, ms);
  };
}
exports.default = debounce;
//# sourceMappingURL=debounce.js.map
