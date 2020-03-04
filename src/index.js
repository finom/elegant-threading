const browserThreading = require('./browserThreading');
const nodeThreading = require('./nodeThreading');

function elegantThreading(source, imports) {
  let threadedFunction;
  if (typeof window !== 'undefined' && typeof window.Worker === 'function') {
    threadedFunction = browserThreading(source, imports);
  } else {
    threadedFunction = nodeThreading(source, imports);
  }

  // calculateHeavyThing.fork()(...args)
  threadedFunction.fork = () => elegantThreading(source, imports);

  return threadedFunction;
}


module.exports = elegantThreading;
