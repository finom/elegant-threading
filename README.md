# elegant-threading [![npm version](https://badge.fury.io/js/elegant-threading.svg)](https://badge.fury.io/js/elegant-threading) [![Build Status](https://travis-ci.org/finom/elegant-threading.svg)](https://travis-ci.org/finom/elegant-threading)

> A straightforward definition of multi-threaded functions for NodeJS and browser

The tool allows to define functions which are going to be executed in a separate thread in the most straightforward way. It has zero dependencies and it doesn't require anything else like an additional Webpack plugin. elegant-threading works both at NodeJS and browsers which makes possible to develop universal functions with heavy calculations (finding prime numbers, working with heavy amounts of data, etc) and publish them at NPM to be used at any of these environments.

Install it via `npm i elegant-threading` or use as a global variable called `elegantThreading` in a non-CJS environment (see dist/ folder).

Let's say you have a function which runs some heavy calculations:

```js
function heavyCalculations(a, b, c) {
  console.log('calculating a heavy thing');
  return calculateHeavyThing(a, b, c);
}

// the main thread is blocked while the function is executed
const result = heavyCalculations(a, b, c);
```

If it blocks the main thread you can wrap `heavyCalculations` by the elegant-threading function and make your code wait a returned promise to be resolved.

```js
const thread = require('elegant-threading');

const heavyCalculations = thread(function heavyCalculations(a, b, c) {
  // yep, console methods also work despite the fact that this is a Worker
  console.log('calculating a heavy thing');
  return calculateHeavyThing(a, b, c);
});

// main thread isn't blocked anymore
const result = await heavyCalculations(a, b, c);
```

The only requirement to the passed function is that it needs to be implemented as a [pure function](https://en.wikipedia.org/wiki/Pure_function) because it has its own scope where other variables defined at the main thread aren't available including global ones like `window`. For more info see [Web Worker docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). [Workers of NodeJS environment](https://nodejs.org/api/worker_threads.html) in their turn are more flexible at this case but it's still recommended to follow the pureness of your function to make it work properly at both environments.

## Forking via threadedFunction.fork()

When a threaded function is defined it creates a single instance of Worker class (Web Worker or a Worker Thread, based on environment) which means that if you call the function multiple times it's going to wait for other calls to be done. Let's say the following function execution takes 1 second.

```js
const heavyCalculations = thread(function heavyCalculations(arg) {
  return calculateHeavyThing(arg); // 1 second
});

console.time('exec');
const [result1, result2, result3] = await Promise.all([
  heavyCalculations(a),
  heavyCalculations(b),
  heavyCalculations(c),
]);
console.timeEnd('exec'); // 3 seconds
```

The overall execution is going to take ~3 seconds because another function isn't able to be called before previous is done.

To make this code run even faster you can fork the threaded function to create its own worker per every fork. It can be made by using `fork` method of a returned threaded function.


```js
const heavyCalculations = thread(function heavyCalculations(arg) {
  return calculateHeavyThing(arg); // 1 second
});

const heavyCalculationsFork1 = heavyCalculations.fork();
const heavyCalculationsFork2 = heavyCalculations.fork();

console.time('exec');
const [result1, result2, result3] = await Promise.all([
  heavyCalculations(a),
  heavyCalculationsFork1(b),
  heavyCalculationsFork2(c),
]);
console.timeEnd('exec'); // 1 second
```

Overall execution time is going to be not more than execution time of the heaviest thread because after they were forked they're going to be executed independently. At the example above it's going to take ~1 second.

## Thread termination via threadedFunction.terminate()

If a forked function is done its job and you want to make its process to die you can terminate it easily.

```js
const heavyCalculations = thread(function heavyCalculations(a, b, c) {
  return calculateHeavyThing(a, b, c);
});

const result1 = await heavyCalculations(a, b, c);

heavyCalculations.terminate();

const result2 = await heavyCalculations(a, b, c); // error
```

## Code splitting

If you want to split a big threaded function into smaller functions it's recommended to do it inside the threaded function.

```js
const heavyCalculations = thread(function heavyCalculations(a, b, c) {
  function foo() {
    // do something
  }

  function bar() {
    // do something
  }

  foo();

  bar();

  return someResult;
});

const result = await heavyCalculations(a, b, c);
```

But there is another way to do that. You can define some functions at the main thread (remember about their pureness!) and pass them as an array as a second argument of elegant-threading function.

```js
function foo() {
  // do something
}

function bar() {
  // do something
}

function main(a, b, c) {
  foo();
  bar();

  return someResult;
}

const heavyCalculations = thread(main, [foo, bar]); // <---

const result = await heavyCalculations(a, b, c);
```

Is required that every exported function needs to be defined as [function declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function). This approach has one downside: since they're stringified to be also a part of an inline worker, an error is thrown inside them may show you a wrong line number. But it can be debugged with the help of `console.log` method or other `console` methods.

## Tests

Tests can be run via `npm test`. They're powered by Jasmine and Karma to make them to be executed both at NodeJS and browser environments.

## Additional information

- [Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) objects aren't able to be transferred yet because they become unavailable at other threads (for the main thread and for other forks). If you have an idea how it could be done in a nice and straightforward way, please create an issue.
