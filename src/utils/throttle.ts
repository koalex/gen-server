export default function throttle(func: Function, ms: number) {
  let isThrottled: boolean = false, savedArgs: any[], savedThis: any;

  function wrapper(...args: any[]) {
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
};
