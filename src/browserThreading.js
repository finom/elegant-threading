const {
  stringifyWorkerSource, getError, workerSymbol,
} = require('./helpers');

const webWorkerSource = require('./webWorkerSource');

let id = 0;
function browserThreading(source, exported) {
  const { Blob, URL, Worker } = window;

  const worker = new Worker(URL.createObjectURL(
    new Blob([stringifyWorkerSource(webWorkerSource, { source, exported })], { type: 'text/javascript' }),
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
      worker.postMessage({
        type: 'call', message, id: currentId, transferableList,
      }, transferableList);
    });
  };

  threadedFunction[workerSymbol] = worker;

  return threadedFunction;
}

module.exports = browserThreading;
