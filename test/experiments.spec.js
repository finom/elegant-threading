const thread = require('../src/');

// The function is used to retrieve JSON data from SharedArrayBuffer
// It supposed to be used in browsers only because Atomics.wait locks a process where it's run
// And browser is going to throw an error if you use it
function retrieveJSONData(buffer) {
  const view = new Int32Array(buffer);
  const LENGTH_INDEX = 1;
  const DATA_BEGIN_INDEX = 2;
  let data;

  const length = view[LENGTH_INDEX];
  if (length) {
    const chars = [];
    // Retieve chars starting index 2, since other two are taken by the lock and string length
    for (let i = DATA_BEGIN_INDEX; i < length + DATA_BEGIN_INDEX; i++) {
      chars.push(String.fromCharCode(view[i]));
    }
    const jsonString = chars.join('');
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      // Make the error to be clear to see what's wrong with JSON
      throw new Error(`${e} ${jsonString}`);
    }
  } else {
    // If there is no data yet, let it be null
    data = null;
  }

  return data;
}

// The function locks given buffer for modifications returned from dataHandler
// After dataHandler is done, the buffer is unlcoked again
// Note that we're going to get and set typed array items via `t[i]` and `t[i]=v`
// instead of Atomics.load and Atomics.store because the first way is a bit faster
function sharedJSONData(buffer, dataHandler) {
  const view = new Int32Array(buffer);
  const LOCKED = 1;
  const UNLOCKED = 0;
  const LOCK_INDEX = 0;
  const LENGTH_INDEX = 1;
  const DATA_BEGIN_INDEX = 2;
  const UNLOCK_TIMEOUT = Infinity; // later we may want to set it as an option

  // That's the trickiest and the most important part of the function.
  // The problem is if you'd use Atomics.wait and then Atomics.store,
  // then another process may update data after "wait" is done but before setting up the lock
  // Unfortunately Atomics doesn't provide API to "wait and store" so there is the trick
  // 1. It waits for the memory to be unlocked
  // 2. Then if it is unlocked it tries to set the lock only if it is still unlocked
  // (if another process didn't cause race condidion)
  // 3. If it is not unlocked go to (1) and wait the memory to be unlocked
  // the funciton is going fto be frozen by Atomics.wait, not by while(true)
  while (true) { // eslint-disable-line no-constant-condition
    Atomics.wait(view, LOCK_INDEX, LOCKED, UNLOCK_TIMEOUT);
    if (UNLOCKED === Atomics.compareExchange(view, LOCK_INDEX, UNLOCKED, LOCKED)) {
      break;
    }
  }

  // Get length of stored JSON
  const length = view[LENGTH_INDEX];
  let data;
  let jsonString;
  if (length) {
    const chars = [];
    // Retieve chars starting index 2, since other two are taken by the lock and string length
    for (let i = DATA_BEGIN_INDEX; i < length + DATA_BEGIN_INDEX; i++) {
      chars.push(String.fromCharCode(view[i]));
    }
    jsonString = chars.join('');
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      // Make the error to be clear to see what's wrong with JSON
      throw new Error(`${e} ${jsonString}`);
    }
  } else {
    // If there is no data yet, let it be null
    data = null;
  }

  let newData;

  // dataHandler is optional
  if (typeof dataHandler === 'function') {
    newData = dataHandler(data);

    // Data is saved only if something is returned from dataHandler
    if (typeof newData !== 'undefined') {
      const jsonToBeSaved = JSON.stringify(newData);
      // Update memory only if JSON is modified
      if (jsonString !== jsonToBeSaved) {
        view[LENGTH_INDEX] = jsonToBeSaved.length;

        for (let i = 0; i < jsonToBeSaved.length; i++) {
          view[DATA_BEGIN_INDEX + i] = jsonToBeSaved[i].charCodeAt(0);
        }
      }
    }
  } else {
    newData = data;
  }

  // Unlock data to be used at other threads
  view[LOCK_INDEX] = UNLOCKED;
  // Notify one process about LOCK_INDEX change
  Atomics.notify(view, LOCK_INDEX, 1);

  return [data, newData];
}


describe('Experiments', () => {
  let DEFAULT_TIMEOUT_INTERVAL;
  beforeEach(() => {
    DEFAULT_TIMEOUT_INTERVAL = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 20;
  });
  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL;
  });
  it('should work with shared JSON data', async () => {
    const sharedBuffer = new SharedArrayBuffer(2 ** 25); // let it be 1 KB for this test
    const forksNumber = 10;
    const workerLoopCycles = 10;

    const crazyJSON = thread((workerBuffer, loopCycles, randomString) => {
      let i = loopCycles;
      while (i--) {
        // The unused vars is left just to not forget what the function returns
        // eslint-disable-next-line no-unused-vars
        const [prev, curr] = sharedJSONData(workerBuffer, (data) => ({
          randomString,
          overallCycles: (data ? data.overallCycles : 0) + 1,
        }));
      }
    }, [sharedJSONData]);

    const promises = [];
    for (let i = 0; i < forksNumber; i++) {
      const randomString = Array.from(Array(100000)).map(
        () => Math.random().toString(36).substring(Math.round(Math.random() * 10)),
      );
      // Create and run forksNumber forks
      promises.push(crazyJSON.fork()(sharedBuffer, workerLoopCycles, randomString));
    }

    console.time('sharedJSONData');
    // Wait for all forks to be done
    await Promise.all(promises);
    console.timeEnd('sharedJSONData');

    const controlData = {};
    console.time('straightforward');
    for (let i = 0; i < forksNumber * workerLoopCycles; i++) {
      const randomString = Array.from(Array(100000)).map(
        () => Math.random().toString(36).substring(Math.round(Math.random() * 10)),
      );
      controlData.randomString = randomString;
      controlData.overallCycles = (controlData.overallCycles ? controlData.overallCycles : 0) + 1;
    }
    console.timeEnd('straightforward');

    const data = retrieveJSONData(sharedBuffer);
    console.log('data', JSON.stringify(data).length, data);


    expect(data.overallCycles).toBe(forksNumber * workerLoopCycles);
  });
});
