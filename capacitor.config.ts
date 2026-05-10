import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.fulljoy.bodylog',
  appName: 'Body Log',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
