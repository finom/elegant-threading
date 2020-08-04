/* globals __SOURCE__, __EXPORTED__, __SOURCE_FUNCTION_NAME__ */
function workerThreadSource() {
  __SOURCE__; // eslint-disable-line no-unused-expressions
  __EXPORTED__; // eslint-disable-line no-unused-expressions
  const { parentPort } = eval('require')('worker_threads'); // eslint-disable-line no-eval

  parentPort.on('message', (data) => {
    if (data.type === 'call') {
      parentPort.postMessage({
        result: __SOURCE_FUNCTION_NAME__.apply(this, data.message),
        id: data.id,
        transferableList: data.transferableList,
      }, data.transferableList || []);
    }
  });
}


module.exports = workerThreadSource;
