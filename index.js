/**
 * @format
 */

import {AppRegistry, ErrorUtils} from 'react-native';
import App from './App';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import {name as appName} from './app.json';
import {saveBackgroundNotification} from './src/utils/backgroundNotificationStorage';

// Global error handler for unhandled JavaScript errors
// Safely get original handler
let originalHandler = null;
try {
  if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
    originalHandler = ErrorUtils.getGlobalHandler();
  }
} catch (e) {
  console.warn('⚠️ [GLOBAL_ERROR] Could not get original error handler:', e);
}

// Set global error handler
if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      // Log to Crashlytics
      if (crashlytics && typeof crashlytics().recordError === 'function') {
        crashlytics().recordError(error);
      }
      console.error('❌ [GLOBAL_ERROR] Unhandled error:', error, 'Fatal:', isFatal);
    } catch (crashlyticsError) {
      console.error('❌ [GLOBAL_ERROR] Error logging to Crashlytics:', crashlyticsError);
    }
    
    // Call original handler
    if (originalHandler && typeof originalHandler === 'function') {
      originalHandler(error, isFatal);
    }
  });
}

// Handle unhandled promise rejections
if (typeof global !== 'undefined') {
  const originalUnhandledRejection = global.onunhandledrejection;
  
  global.onunhandledrejection = (event) => {
    try {
      const error = event?.reason || new Error('Unhandled Promise Rejection');
      if (crashlytics && typeof crashlytics().recordError === 'function') {
        crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
      }
      console.error('❌ [GLOBAL_ERROR] Unhandled promise rejection:', error);
    } catch (crashlyticsError) {
      console.error('❌ [GLOBAL_ERROR] Error logging promise rejection to Crashlytics:', crashlyticsError);
    }
    
    // Call original handler if exists
    if (originalUnhandledRejection && typeof originalUnhandledRejection === 'function') {
      originalUnhandledRejection(event);
    }
  };
}

// Background message handler - called when app is in background
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    console.log('📨 [FCM] Background message handled:', JSON.stringify(remoteMessage));
    console.log('📨 [FCM] Message type:', remoteMessage.messageId);
    console.log('📨 [FCM] Has notification:', !!remoteMessage.notification);
    console.log('📨 [FCM] Has data:', !!remoteMessage.data);
    
    // Save notification to storage
    await saveBackgroundNotification(remoteMessage);
    console.log('✅ [FCM] Background notification saved successfully');
  } catch (error) {
    console.error('❌ [FCM] Error in background message handler:', error);
  }
});

AppRegistry.registerComponent(appName, () => App);
