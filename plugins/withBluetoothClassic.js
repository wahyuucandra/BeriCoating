const { withAndroidManifest } = require('@expo/config-plugins');

const withBluetoothClassic = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // Ensure <uses-permission-sdk-23> is present for Android 12+
    const usesPermissionSdk23 = manifest.manifest['uses-permission-sdk-23'] || [];

    const requiredPermissions = [
      {
        name: 'android.permission.BLUETOOTH_SCAN',
        maxSdkVersion: 30,
      },
      {
        name: 'android.permission.BLUETOOTH_CONNECT',
        maxSdkVersion: undefined,
      },
    ];

    requiredPermissions.forEach((perm) => {
      const existing = usesPermissionSdk23.find(
        (p) => (p.$ && p.$['android:name']) === perm.name
      );
      if (!existing) {
        usesPermissionSdk23.push({
          $: {
            'android:name': perm.name,
            ...(perm.maxSdkVersion
              ? { 'android:maxSdkVersion': String(perm.maxSdkVersion) }
              : {}),
          },
        });
      }
    });

    manifest.manifest['uses-permission-sdk-23'] = usesPermissionSdk23;

    // Add <uses-feature> for Bluetooth
    const usesFeature = manifest.manifest['uses-feature'] || [];
    const bluetoothFeature = usesFeature.find(
      (f) => (f.$ && f.$['android:name']) === 'android.hardware.bluetooth'
    );
    if (!bluetoothFeature) {
      usesFeature.push({
        $: {
          'android:name': 'android.hardware.bluetooth',
          'android:required': 'true',
        },
      });
    }
    manifest.manifest['uses-feature'] = usesFeature;

    return config;
  });
};

module.exports = withBluetoothClassic;