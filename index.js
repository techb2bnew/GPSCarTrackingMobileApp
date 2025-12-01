/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import messaging from '@react-native-firebase/messaging';
import {name as appName} from './app.json';
import {saveBackgroundNotification} from './src/utils/backgroundNotificationStorage';

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
