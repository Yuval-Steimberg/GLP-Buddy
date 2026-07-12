import type { CapacitorConfig } from '@capacitor/cli'

// Native shell config. The built web app (dist/) is bundled into the iOS and
// Android apps and talks to Supabase over the network — a real native app, not
// a remote-URL webview wrapper (which App Review tends to reject).
const config: CapacitorConfig = {
  appId: 'com.glpenpal.mobile.ios',
  appName: 'GLPenPal',
  webDir: 'dist',
  backgroundColor: '#f6f4ee',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#f6f4ee',
  },
}

export default config
