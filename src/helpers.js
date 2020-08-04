const defaultMainFunctionName = 'anonymous0';

function getError(name) {
  return new Error(`Threading error: ${{
    TERMINATED: 'Cannot call threaded function because its worker was terminated',
    EXPORT_FUNCTION_DECLARATION: 'Exported functions need to be defined as function declaration',
    TRANSFERABLE_ARRAY: 'Transferable items must be an array',
    SET_IS_TERMINATED: 'threadedFunction.isTerminated cannot be set',
  }[name]}` || 'Unknown error');
}

function stringifyExpored(exported = []) {
  return `${exported.map((func) => {
    const stringified = func.toString();
    if (!stringified.match(/function\s*\w+\s*\([\s\S]+/)) {
      throw getError('EXPORT_FUNCTION_DECLARATION');
    }
    return stringified;
  }).join(';\n')};\n`;
}

function stringifySource(source) {
  return source.name ? source.toString() : `const ${defaultMainFunctionName} = ${source.toString()};`;
}

function getSourceFunctionName(source) {
  return source.name || defaultMainFunctionName;
}

const workerSymbol = Symbol('worker');

module.exports = {
  stringifyExpored, stringifySource, getError, getSourceFunctionName, workerSymbol,
};
