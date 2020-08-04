/* globals __SOURCE__, __EXPORTED__, __SOURCE_FUNCTION_NAME__, self */
/* eslint-disable no-restricted-globals */
function webWorkerSource() {
  __SOURCE__; // eslint-disable-line no-unused-expressions
  __EXPORTED__; // eslint-disable-line no-unused-expressions

  let latestId0;

  function callConsole0(method, args) {
    try {
      self.postMessage({
        type: 'console', method, args: [].slice.call(args), id: latestId0,
      });
    } catch (e) {
      self.postMessage({
        type: 'call',
        error: {
          name: e.name,
          stack: e.stack,
          message: e.message,
        },
        id: latestId0,
      });
    }
  }

  const consoleMethods0 = ['log', 'info', 'error', 'warn', 'clear', 'time', 'timeEnd', 'table', 'count', 'group', 'groupEnd'];
  const console = {};

  for (let i0 = 0; i0 < consoleMethods0.length; i0++) {
    console[consoleMethods0[i0]] = function consoleMethod() {
      callConsole0(consoleMethods0[i0], arguments); // eslint-disable-line prefer-rest-params
    };
  }

  self.onmessage = function onmessage(e) {
    let result;
    let error;
    if (e.data.type === 'call') {
      latestId0 = e.data.id;
      try {
        result = __SOURCE_FUNCTION_NAME__.apply(this, e.data.message);
      } catch (err) {
        error = {
          name: err.name,
          stack: err.stack,
          message: err.message,
        };
      }

      self.postMessage({
        type: 'call',
        result,
        error,
        id: e.data.id,
        transferableList: e.data.transferableList,
      }, e.data.transferableList || []);
    }
  };
}


module.exports = webWorkerSource;
