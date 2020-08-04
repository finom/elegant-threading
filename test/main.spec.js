const thread = require('../src');

describe('Main', () => {
  it('should run simple calculations', async () => {
    const f = thread((a, b, c) => a + b + c);
    expect(await f(1, 2, 3)).toBe(6);
  });

  it('should run simple calculations made at promise', async () => {
    const f = thread((a, b, c) => new Promise((resolve) => resolve(a + b + c)));
    expect(await f(1, 2, 3)).toBe(6);
  });

  it('should run simple calculations made at async function', async () => {
    const f = thread(async (a, b, c) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return a + b + c;
    });
    expect(await f(1, 2, 3)).toBe(6);
  });

  it('should throw an error if worker is terminated', (done) => {
    const f = thread(() => {});
    expect(f.isTerminated).toBe(false);
    f.terminate();
    expect(f.isTerminated).toBe(true);
    expect(() => { f.isTerminated = false; }).toThrow();

    f().then(() => done(new Error('Promise should not be resolved')), () => done());
  });

  it('should fork', async () => {
    const f = thread((runId) => {
      const workerNow = Date.now();
      // "calculation" is going to take 1 second
      while (workerNow > Date.now() - 1000) {
        // noop
      }

      return runId;
    });

    let now = Date.now();

    let result = await Promise.all([
      f('one'), f('two'), f('three'),
    ]);

    expect(result).toEqual(['one', 'two', 'three']);

    const nonForkedExecutionTime = Date.now() - now;

    now = Date.now();
    result = await Promise.all([
      f('one'), f.fork()('two'), f.fork()('three'),
    ]);

    expect(result).toEqual(['one', 'two', 'three']);

    const forkedExecutionTime = Date.now() - now;

    // forked threads are supposed to be finished 3 times faster
    expect(Math.round(nonForkedExecutionTime / forkedExecutionTime)).toBe(3);
  });

  it('should not resolve another execution result if one calculation is faster than another', async () => {
    const f = thread((execTime, runId) => {
      const workerNow = Date.now();
      while (workerNow > Date.now() - execTime) {
        // noop
      }

      return runId;
    });

    await Promise.all([
      f(500, 'faster').then((result) => expect(result).toBe('faster')),
      f(1000, 'slower').then((result) => expect(result).toBe('slower')),
    ]);
  });

  it('should be able to use imported functions', async () => {
    function f1(a, b) { return a + b; }
    function f2(c, d) { return c + d; }
    function main(a, b, c, d) {
      return f1(a, b) + f2(c, d);
    }
    const f = thread(main, [f1, f2]);
    expect(await f(1, 2, 10, 20)).toBe(33);
  });

  it('should be able to use imported function inside another imported function', async () => {
    function f1(a, b) { return f2(a, b); } // eslint-disable-line no-use-before-define
    function f2(a, b) { return a + b; }
    function main(a, b) {
      return f1(a, b);
    }
    const f = thread(main, [f1, f2]);
    expect(await f(1, 2)).toBe(3);
  });

  it('shoud throw an error if an exported function isn\'t defined as a function declaration', () => {
    const f1 = () => {};
    expect(() => thread(() => {}, [f1])).toThrow();
  });

  it('should catch errors and reject promise', (done) => {
    const f = thread(() => {
      throw new Error('nooo');
    });

    f().then(() => done(new Error('Promise should not be resolved')), (reason) => {
      expect(`${reason}`).toBe('Error: nooo');
      done();
    });
  });

  // it's not possible to check do console methods work via expectations
  // and they need too be checked visually at test output
  it('should log', async () => {
    /* eslint-disable no-console */
    const f = thread(() => {
      console.log('console.log WORKS');
      console.info('console.info WORKS');
      console.error('console.error WORKS');
      console.warn('console.warn WORKS');
    });

    console.log('console check');
    /* eslint-enable no-console */
    await f();
  });

  it('supports Transferable objects', async () => {
    let buffer = new ArrayBuffer(8);
    let view = new Int32Array(buffer);
    view[0] = 1;
    view[1] = 2;

    expect(Array.from(view)).toEqual([1, 2]);

    const f = thread((workerBuffer, a, b) => {
      const workerView = new Int32Array(workerBuffer);

      workerView[0] = a;
      workerView[1] = b;

      // TODO how to test that the object was actually transferred back?
      return workerBuffer;
    });

    buffer = await f.callWithTransferable([buffer], buffer, 3, 4);
    // we expect that we have lost access to the transferrable object
    expect(() => Array.from(view)).toThrow();
    view = new Int32Array(buffer);

    expect(Array.from(view)).toEqual([3, 4]);
  });

  // disable test for older environments
  (typeof SharedArrayBuffer === 'undefined' ? xit : it)('should work fine with SharedArrayBuffer', async () => {
    if (typeof SharedArrayBuffer === 'undefined') return;
    const buffer = new SharedArrayBuffer(8);
    const view = new Int32Array(buffer);
    view[0] = 1;
    view[1] = 2;

    expect(Array.from(view)).toEqual([1, 2]);

    const f = thread((workerBuffer, a, b) => {
      const workerView = new Int32Array(workerBuffer);

      workerView[0] = a;
      workerView[1] = b;
    });

    await f(buffer, 3, 4);

    expect(Array.from(view)).toEqual([3, 4]);
  });
});
