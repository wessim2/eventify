// eslint-disable-next-line @typescript-eslint/no-var-packages, @typescript-eslint/no-require-imports
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Do not externalize @eventify/shared-types, so Webpack bundles it inline
        allowlist: ['@eventify/shared-types'],
      }),
    ],
  };
};
