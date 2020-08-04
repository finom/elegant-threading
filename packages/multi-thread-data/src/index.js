const constants = require('./constants');
const insecureRetrieve = require('./insecureRetrieve');


// The function locks given buffer for modifications returned from dataHandler
// After dataHandler is done, the buffer is unlcoked again
// Note that we're going to get and set typed array items via `t[i]` and `t[i]=v`
// instead of Atomics.load and Atomics.store because the first way is a bit faster
function multiThreadData(buffer, dataHandler) {
  const metaView = new Int32Array(buffer, 0, 2);
  const {
    LOCKED, UNLOCKED, LOCK_INDEX, LENGTH_INDEX, DATA_BYTE_OFFSET, UNLOCK_TIMEOUT,
  } = multiThreadData.constants;

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
    Atomics.wait(metaView, LOCK_INDEX, LOCKED, UNLOCK_TIMEOUT);
    if (UNLOCKED === Atomics.compareExchange(metaView, LOCK_INDEX, UNLOCKED, LOCKED)) {
      break;
    }
  }

  // Get length of stored JSON
  const length = metaView[LENGTH_INDEX];
  let data;
  let jsonString;
  if (length) {
    const view = new Uint8Array(buffer, DATA_BYTE_OFFSET, length);
    const decoder = new TextDecoder();

    // Retieve chars starting index 2, since other two are taken by the lock and string length
    jsonString = decoder.decode(view);
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
        const encoder = new TextEncoder();
        const view = new Uint8Array(buffer, DATA_BYTE_OFFSET);
        const { written } = encoder.encodeInto(jsonToBeSaved, view);
        metaView[LENGTH_INDEX] = written;
      }
    }
  } else {
    newData = data;
  }

  // Unlock data to be used at other threads
  metaView[LOCK_INDEX] = UNLOCKED;
  // Notify one process about LOCK_INDEX change
  Atomics.notify(metaView, LOCK_INDEX, 1);

  return [data, newData];
}

module.exports = Object.assign(multiThreadData, { constants, insecureRetrieve });
