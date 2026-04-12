import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarmizos.app',
  appName: 'ترميز OS',
  webDir: 'apps/dashboard/dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#fefcf9",
      showSpinner: false,
      androidSplashResourceName: "splash",
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#fefcf9"
    }
  }
};

export default config;
