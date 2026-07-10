const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Ensure module source is resolved
config.resolver.nodeModulesPaths = [
  __dirname + '/modules',
  ...(config.resolver.nodeModulesPaths || []),
];

module.exports = config;