const thread = require('../src/');
const multiThreadData = require('../packages/multi-thread-data/src/');

describe('Experiments', () => {
  let DEFAULT_TIMEOUT_INTERVAL;
  beforeEach(() => {
    DEFAULT_TIMEOUT_INTERVAL = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 20;
  });
  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL;
  });
  xit('should work with shared JSON data', async () => {
    const sharedBuffer = new SharedArrayBuffer(2 ** 25); // let it be 1 KB for this test
    const forksNumber = 30;
    const workerLoopCycles = 30;

    const crazyJSON = thread((workerBuffer, loopCycles) => {
      let i = loopCycles;
      while (i--) {
        const randomString = Array.from(Array(1000)).map(
          () => Math.random().toString(36).substring(Math.round(Math.random() * 10)),
        );
        // The unused vars is left just to not forget what the function returns
        // eslint-disable-next-line no-unused-vars
        const [prev, curr] = multiThreadData(workerBuffer, (data) => ({
          randomString,
          overallCycles: (data ? data.overallCycles : 0) + 1,
        }));
      }
    }, [multiThreadData]);

    const promises = [];
    console.time('sharedJSONData');
    for (let i = 0; i < forksNumber; i++) {
      // Create and run forksNumber forks
      promises.push(crazyJSON.fork()(sharedBuffer, workerLoopCycles));
    }
    console.log('dick');

    // Wait for all forks to be done
    await Promise.all(promises);

    console.timeEnd('sharedJSONData');

    const controlData = {};
    console.time('straightforward');
    for (let i = 0; i < forksNumber * workerLoopCycles; i++) {
      const randomString = Array.from(Array(1000)).map(
        () => Math.random().toString(36).substring(Math.round(Math.random() * 10)),
      );
      controlData.randomString = randomString;
      controlData.overallCycles = (controlData.overallCycles ? controlData.overallCycles : 0) + 1;
    }
    console.timeEnd('straightforward');
    return;
    const data = multiThreadData.insecureRetrieve(sharedBuffer);
    console.log('data', JSON.stringify(data).length, data);


    expect(data.overallCycles).toBe(forksNumber * workerLoopCycles);
  });
});
