const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add asset extensions for bundled data files
config.resolver.assetExts.push("sqlite", "gz", "wasm");

// Configure web-specific module resolution
config.resolver.platforms = ['web', 'ios', 'android'];

// Add web-specific aliases
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'expo-clipboard': 'expo-clipboard/build/web/ClipboardModule.js',
};

module.exports = config;
