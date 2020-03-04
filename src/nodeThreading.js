const {
  stringifyExpored, stringifySource, getError, getSourceFunctionName,
} = require('./helpers');

let id = 0;
function nodeThreading(source, exported) {
  // eval is used to get "require" function but it should be invisible for bundlers like Webpack
  const { Worker } = eval('require')('worker_threads'); // eslint-disable-line no-eval
  const worker = new Worker(
    `${stringifySource(source)}
    ${stringifyExpored(exported)}
      const { parentPort, MessageChannel } = require('worker_threads');

      parentPort.on('message', function(data0) {
        parentPort.postMessage({ result: ${getSourceFunctionName(source)}.apply(this, data0.message), id: data0.id });
      });

    `,
    { eval: true },
  );

  const symbols = Object.getOwnPropertySymbols(worker);
  const kHandleSymbol = symbols.find(({ description }) => description === 'kHandle');
  const kHandle = worker[kHandleSymbol];


  const threadedFunction = (...message) => new Promise((resolve, reject) => {
    if (worker.__isTerminated) {
      throw getError('TERMINATED');
    }
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
    worker.postMessage({ message, id: currentId });
  });

  threadedFunction.terminate = () => {
    worker.__isTerminated = true;
    worker.terminate();
  };

  return threadedFunction;
}


module.exports = nodeThreading;
