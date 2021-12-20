export default function debounce(f: Function, ms: number) {
  let timer: NodeJS.Timeout | null = null;

  return function (...args: any[]) {
    const onComplete = () => {
      // @ts-ignore
      f.apply(this, args);
      timer = null;
    };

    if (timer) clearTimeout(timer);

    timer = setTimeout(onComplete, ms);
  };
}
