// const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * @type {import('@react-native/metro-config').MetroConfig}
//  */

// const config = {};

// module.exports = mergeConfig(getDefaultConfig(__dirname), config);


const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

// Your base config
const baseConfig = getDefaultConfig(__dirname);

// Your custom config (empty or additional changes if needed)
const customConfig = {
  // Example:
  // transformer: { assetPlugins: ['expo-asset/tools/hashAssetFiles'] },
};

// Merge your custom config with default
const mergedConfig = mergeConfig(baseConfig, customConfig);

// Wrap with Reanimated config
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);
