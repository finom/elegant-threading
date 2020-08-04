const {
  stringifyWorkerSource, getError, workerSymbol,
} = require('./helpers');

const workerThreadSource = require('./workerThreadSource');

let id = 0;
function nodeThreading(source, exported) {
  // eval is used to get "require" function but it should be invisible for bundlers like Webpack
  const { Worker } = eval('require')('worker_threads'); // eslint-disable-line no-eval
  const worker = new Worker(
    stringifyWorkerSource(workerThreadSource, { source, exported }),
    { eval: true },
  );

  const symbols = Object.getOwnPropertySymbols(worker);
  const kHandleSymbol = symbols.find(({ description }) => description === 'kHandle');
  const kHandle = worker[kHandleSymbol];


  const threadedFunction = (...message) => {
    const transferableList = threadedFunction.__transferableList;
    delete threadedFunction.__transferableList;
    return new Promise((resolve, reject) => {
      if (worker.__isTerminated) throw getError('TERMINATED');
      const currentId = id++;
      const onMessage = (data) => {
        if (data.id === currentId) {
          kHandle.unref();
          worker.off('message', onMessage);
          worker.off('message', onError); // eslint-disable-line no-use-before-define
          resolve(data.result);
        }
      };

      const onError = (e) => {
        kHandle.unref();
        worker.off('message', onMessage);
        worker.off('message', onError);
        reject(e);
      };

      kHandle.ref();
      worker.on('message', onMessage);
      worker.on('error', onError);
      worker.postMessage({
        type: 'call', message, id: currentId, transferableList,
      }, transferableList || []);
    });
  };

  threadedFunction[workerSymbol] = worker;

  return threadedFunction;
}


module.exports = nodeThreading;
