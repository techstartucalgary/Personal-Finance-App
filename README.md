# Sterling Budgeting App

A personal finance application built with React Native, Expo, and Supabase.

## ⚠️ Important: Google Authentication

**Google Sign-In is NOT supported on the Web version of this app.**

This project uses native modules (`@react-native-google-signin/google-signin`, `expo-crypto`) for secure authentication. You must run the app on a native iOS Simulator or Android Emulator using a **Development Build**.

Standard "Expo Go" client will NOT work for authentication because it does not include the required native Google Sign-In code.

## Prerequisites

- Node.js
- **iOS**: Xcode (macOS only)
- **Android**: Android Studio & Java Development Kit (JDK)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure you have your Supabase credentials in `.env` (or `.env.local`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

## Running the App

### Expo Go
1. Start the development build
   ```bash
   npx expo start
   ```
2. Open Expo Go on your phone and scan the QR code.

### 🍎 iOS (Simulator)
*Requires a Mac with Xcode installed.*

1. Build and run the native app:
   ```bash
   npx expo run:ios
   ```
   *This command builds the native project, installs it on the simulator, and starts the Metro bundler.*

### 🤖 Android (Emulator)
*Requires Android Studio.*

1. Start your Android Emulator via Android Studio.
2. Build and run the native app:
   ```bash
   npx expo run:android
   ```

### 🌐 Web
*Note: Google Sign-In will NOT work.*

```bash
npx expo start --web
```

## Troubleshooting

- **"Cannot find native module"**: You are likely trying to use Expo Go. Please use `npx expo run:ios` or `npx expo run:android` to create a custom development build.
- **CocoaPods errors**: Run `cd ios && pod install && cd ..`

## Feature Documentation

Deeper documentation for individual features lives under [`docs/`](docs/).

- [AI Chatbot](docs/README.md) — chat API, AI tools, embedding pipeline, hybrid retrieval, configuration, and troubleshooting.
