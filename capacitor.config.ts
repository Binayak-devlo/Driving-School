import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goldenhands.drivingschool',
  appName: 'Golden Hands Driving School',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
