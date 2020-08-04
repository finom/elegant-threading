const constants = require('./constants');

// The function is used to retrieve JSON data from SharedArrayBuffer
// It supposed to be used in browsers only because Atomics.wait locks a process where it's run
// And browser is going to throw an error if you use it
function insecureRetrieve(buffer) {
  const metaView = new Int32Array(buffer, 0, 2);
  const { DATA_BYTE_OFFSET, LENGTH_INDEX } = insecureRetrieve.constants;
  let data;

  const length = metaView[LENGTH_INDEX];
  if (length) {
    const view = new Uint8Array(buffer, DATA_BYTE_OFFSET, length);
    const decoder = new TextDecoder();

    // Retieve chars starting index 2, since other two are taken by the lock and string length
    const jsonString = decoder.decode(view);
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


insecureRetrieve.constants = constants;

module.exports = insecureRetrieve;
