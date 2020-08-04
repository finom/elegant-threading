const {
  stringifyExpored, stringifySource, getError, getSourceFunctionName, workerSymbol,
} = require('./helpers');

let id = 0;
function browserThreading(source, exported) {
  const { Blob, URL, Worker } = window;

  const worker = new Worker(URL.createObjectURL(
    new Blob([`${stringifySource(source)}
      ${stringifyExpored(exported)}

      let latestId0;

      function callConsole0(method, args) {
        try {
          postMessage({ type: 'console', method: method, args: [].slice.call(args), id: latestId0 });
        } catch(e) {
          postMessage({ type: 'call', error: {
            name: e.name,
            stack: e.stack,
            message: e.message,
            lineNumber: e.lineNumber,
            columnNumber: e.columnNumber,
          }, id: latestId0 });
        }
      }

      const consoleMethods0 = ['log', 'info', 'error', 'warn', 'clear', 'time', 'timeEnd', 'table', 'count', 'group', 'groupEnd'];
      const console = {};

      for(let i0 = 0; i0 < consoleMethods0.length; i0++) {
        console[consoleMethods0[i0]] = function() { callConsole0(consoleMethods0[i0], arguments) }
      }

      onmessage = function(e) {
        let result, error;
        latestId0 = e.data.id;
        try { result = ${getSourceFunctionName(source)}.apply(this, e.data.message) } catch(e) { error = {
          name: e.name,
          stack: e.stack,
          message: e.message,
          lineNumber: e.lineNumber,
          columnNumber: e.columnNumber,
        }; }

        Promise.resolve(result).then(function(promiseResult) {
          postMessage({
            type: 'call',
            result: promiseResult,
            error: error,
            id: e.data.id,
            transferableList: e.data.transferableList,
          }, e.data.transferableList || []);
        })
        
      }
    `], { type: 'text/javascript' }),
  ));

  const threadedFunction = (...message) => {
    const transferableList = threadedFunction.__transferableList;
    delete threadedFunction.__transferableList;

    return new Promise((resolve, reject) => {
      if (worker.__isTerminated) throw getError('TERMINATED');
      const currentId = id++;
      const onMessage = ({ data }) => {
        if (data.id === currentId) {
          if (data.type === 'call') {
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError); // eslint-disable-line no-use-before-define
            if (data.error) {
              reject(Object.assign(Object.create(Error.prototype), data.error));
            } else {
              resolve(data.result);
            }
          } else if (data.type === 'console') {
          // eslint-disable-next-line no-console
            console[data.method](...data.args);
          }
        }
      };

      const onError = (e) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        reject(e);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ message, id: currentId, transferableList }, transferableList);
    });
  };

  threadedFunction[workerSymbol] = worker;

  return threadedFunction;
}

module.exports = browserThreading;
