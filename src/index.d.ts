declare module 'elegant-threading' {
  interface Forkable<F> {
    (...args: Parameters<F>): Promise<ReturnType<F>>;
    fork: () => Forkable<F>;
    terminate: () => void
  }

  function elegantThreading<F>(func: F): Forkable<F>;

  export default elegantThreading;
}
