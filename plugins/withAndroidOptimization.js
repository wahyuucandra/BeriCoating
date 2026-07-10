const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Inject Android release-build optimizations into gradle.properties.
 * Properti ini akan bertahan setiap kali `npx expo prebuild` dijalankan.
 */
const withAndroidOptimization = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const setIfMissing = (key, value) => {
      const existing = props.find((p) => p.key === key);
      if (!existing) {
        props.push({ key, value, type: 'property' });
      } else {
        existing.value = value;
      }
    };

    // Hanya build untuk arm64-v8a (Android modern 64-bit)
    setIfMissing('reactNativeArchitectures', 'arm64-v8a');

    // Aktifkan ProGuard / R8 minify
    setIfMissing('android.enableMinifyInReleaseBuilds', 'true');

    // Hapus resource yang tidak terpakai
    setIfMissing('android.enableShrinkResourcesInReleaseBuilds', 'true');

    // Kompres JS bundle
    setIfMissing('android.enableBundleCompression', 'true');

    return config;
  });
};

module.exports = withAndroidOptimization;