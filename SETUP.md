# EasyConnectSocial — Setup & Installation

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20.x | Required by EAS/GitHub Actions |
| npm | 10.x | Bundled with Node |
| Expo CLI | Latest | `npx expo` |
| EAS CLI | ≥ 3.0 | `npm install -g eas-cli` |
| Android Studio | Latest | For Android emulator |
| Xcode | Latest | For iOS simulator (macOS only) |
| Expo Go | Latest | Physical device testing |

---

## Quick Start

```bash
# 1. Clone and enter project
git clone <repo-url> EasyConnectSocial
cd EasyConnectSocial

# 2. Install dependencies
npm install

# 3. Copy environment template and fill in Firebase values
cp .env.example .env.local
```

Edit `.env.local` with your Firebase project credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

```bash
# 4. Start development
npx expo start
```

Scan QR code with Expo Go (Android/iOS) or press:
- `a` — Android emulator
- `i` — iOS simulator (macOS)
- `w` — Web browser

---

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project (or use existing)
3. Register app → Web (</>) → copy config values

### 2. Enable Authentication
1. Authentication → Sign-in method → **Email/Password**
2. Enable provider

### 3. Create Firestore Database
1. Firestore Database → Create database
2. Choose location → Start in **test mode** (or configure security rules):

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Create Storage Bucket
1. Storage → Get started → Set up bucket
2. Default rules (adjust for production):

```javascript
// Storage Security Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Running on Devices

### Expo Go (easiest for testing)
```bash
npx expo start
```
Scan QR with Expo Go app (iOS/Android).

### Android APK (EAS Build)
```bash
# Preview APK (local testing)
eas build --platform android --profile preview

# Production APK
eas build --platform android --profile production
```

### iOS (requires Apple Developer account)
```bash
eas build --platform ios --profile preview
```

---

## Deep Linking

### Android
Add to `AndroidManifest.xml` (auto-configured by Expo, but verify):
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="easyconnectsocial" />
</intent-filter>
```

### iOS
Add to `Info.plist` (auto-configured by Expo):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>easyconnectsocial</string></array>
  </dict>
</array>
```

---

## Admin Setup (First User)

1. Register through the invite flow is invite-only
2. **Bootstrap first admin** — Manually create a user document in Firestore:
   ```
   Collection: users
   Document ID: <Firebase Auth UID>
   Fields:
     uid: "<Auth UID>"
     phone: "1234567890"
     name: "Admin"
     role: "admin"
     isActive: true
     createdAt: <current timestamp>
   ```
3. The admin can now generate invites from **Profile → Admin Settings → Invite**
4. Other users register via invite links

---

## CI/CD (GitHub Actions)

The project includes `.github/workflows/build-apk.yml` for automated builds.

### GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | EAS auth token (`eas login` → `eas whoami` → copy token) |
| `FIREBASE_API_KEY` | From Firebase config |
| `FIREBASE_AUTH_DOMAIN` | From Firebase config |
| `FIREBASE_PROJECT_ID` | From Firebase config |
| `FIREBASE_STORAGE_BUCKET` | From Firebase config |
| `FIREBASE_MESSAGING_SENDER_ID` | From Firebase config |
| `FIREBASE_APP_ID` | From Firebase config |

### Manual Build
Push to `main`/`master` or go to Actions → "Build APK" → Run workflow.

---

## Troubleshooting

### "Cannot find module 'expo-clipboard'" or similar
```bash
npx expo install expo-clipboard expo-crypto expo-file-system expo-image-picker expo-av
```

### Firebase "auth/configuration-not-found"
- Verify Email/Password auth is enabled in Firebase Console
- Check `.env.local` values match Firebase project

### EAS Build fails
```bash
eas build --platform android --profile preview --local
```

### Metro bundler issues
```bash
npx expo start --clear
```

---

## Key Commands Reference

```bash
npm start          # Start Expo dev server
npm run android    # Start + open Android
npm run ios        # Start + open iOS
npm run web        # Start + open Web
eas login          # Authenticate EAS
eas build:list     # List recent builds
eas build --platform android --profile preview  # Build APK
npx expo install <package>  # Install Expo-compatible package
npx expo start --clear      # Clear Metro cache
```
