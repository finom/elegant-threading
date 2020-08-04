const defaultMainFunctionName = 'anonymous0';

function getError(name) {
  return new Error(`Threading error: ${{
    TERMINATED: 'Cannot call threaded function because its worker was terminated',
    EXPORT_FUNCTION_DECLARATION: 'Exported functions need to be defined as function declaration',
    TRANSFERABLE_ARRAY: 'Transferable items must be an array',
    SET_IS_TERMINATED: 'threadedFunction.isTerminated cannot be set',
  }[name]}` || 'Unknown error');
}


function stringifyWorkerSource(workerSource, { source, exported = [] }) {
  const stringifiedExported = `${exported.map((func) => {
    const stringified = func.toString();
    if (!stringified.match(/function\s*\w+\s*\([\s\S]+/)) {
      throw getError('EXPORT_FUNCTION_DECLARATION');
    }
    return stringified;
  }).join(';\n')};\n`;

  const stringifiedSource = source.name ? source.toString() : `const ${defaultMainFunctionName} = ${source.toString()};`;

  const sourceFunctionName = source.name || defaultMainFunctionName;

  const webWorkerSourceString = workerSource.toString();
  return webWorkerSourceString
    .slice(
      webWorkerSourceString.indexOf('{') + 1,
      webWorkerSourceString.lastIndexOf('}'),
    )
    .trim()
    .replace('__SOURCE__', stringifiedSource)
    .replace('__EXPORTED__', stringifiedExported)
    .replace('__SOURCE_FUNCTION_NAME__', sourceFunctionName);
}

function serializePlugin(plugin) {
  if (typeof plugin === 'function') {
    const pluginStr = plugin.toString();
    return {
      __type: 'function',
      body: pluginStr.slice(
        pluginStr.indexOf('{') + 1,
        pluginStr.lastIndexOf('}'),
      ),
      // source https://stackoverflow.com/a/31194949/10646303
      args: pluginStr.replace(/[/][/].*$/mg, '') // strip single-line comments
        .replace(/\s+/g, '') // strip white space
        .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
        .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
        .replace(/=[^,]+/g, '') // strip any ES6 defaults
        .split(',').filter(Boolean), // split & filter [""]
      members: Object.keys(plugin).map((key) => ({
        key,
        plugin: serializePlugin(plugin[key]),
      })),
    };
  }
  return plugin;
}


const workerSymbol = Symbol('worker');

module.exports = {
  getError, workerSymbol, stringifyWorkerSource,
};
