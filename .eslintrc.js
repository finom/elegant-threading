module.exports = {
    root: true,
    extends: 'airbnb-base',
    parser: 'babel-eslint',
    rules: {
      'no-plusplus': 0,
      'no-underscore-dangle': 0,
    },
    env: {
      jasmine: true,
    },
    globals: {
        window: true
    }
};
