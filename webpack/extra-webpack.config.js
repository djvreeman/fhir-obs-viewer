const path = require('path');

module.exports = (config) => {
  config.module.rules.push(
    {
      test: /definitions\/index.json$/,
      use: [
        {
          loader: path.resolve(
            'prev/source/js/search-parameters/definitions/webpack-loader.js'
          ),
          options: require(path.resolve(
            'prev/source/js/search-parameters/definitions/webpack-options.json'
          ))
        }
      ]
    },
    {
      test: /package.json$/,
      use: [
        {
          loader: path.resolve('webpack/package-json-loader.js')
        }
      ]
    }
  );

  return config;
};
