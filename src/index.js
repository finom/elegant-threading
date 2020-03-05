const browserThreading = require('./browserThreading');
const nodeThreading = require('./nodeThreading');
const { getError, workerSymbol } = require('./helpers');

function elegantThreading(source, imports) {
  let threadedFunction;
  if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
    threadedFunction = browserThreading(source, imports);
  } else {
    threadedFunction = nodeThreading(source, imports);
  }

  // calculateHeavyThing.fork()(...args)
  threadedFunction.fork = () => elegantThreading(source, imports);

  threadedFunction.callWithTransferable = function callWithTransferable(
    transferableList, ...message
  ) {
    if (!(transferableList instanceof Array)) {
      throw getError('TRANSFERABLE_ARRAY');
    }
    threadedFunction.__transferableList = transferableList;
    return threadedFunction(...message);
  };

  const worker = threadedFunction[workerSymbol];

  worker.__isTerminated = false;

  Object.defineProperty(threadedFunction, 'isTerminated', {
    configurable: false,
    get: () => worker.__isTerminated,
    set: () => { throw getError('SET_IS_TERMINATED'); },
  });

  threadedFunction.terminate = () => {
    worker.__isTerminated = true;
    worker.terminate();
  };

  return threadedFunction;
}


module.exports = elegantThreading;
