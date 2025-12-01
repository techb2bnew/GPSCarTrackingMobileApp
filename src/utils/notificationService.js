import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import { saveBackgroundNotification } from './backgroundNotificationStorage';

/**
 * Initialize PushNotification configuration
 * This should be called once at app startup
 */
export const configurePushNotifications = () => {
  PushNotification.configure({
    // Called when a notification is received
    onNotification: function (notification) {
      console.log('📨 [NOTIFICATION] Notification received:', notification);
      
      // If app is in background, save notification to storage
      // This handles notifications that arrive when app is in background
      if (notification.userInteraction === false) {
        // App is in background, save to storage
        console.log('📨 [NOTIFICATION] App in background, saving notification...');
        const remoteMessage = {
          notification: {
            title: notification.title,
            body: notification.message || notification.body,
          },
          data: notification.data || notification.userInfo || {},
        };
        saveBackgroundNotification(remoteMessage).catch(err => {
          console.error('❌ [NOTIFICATION] Error saving background notification:', err);
        });
      }
    },

    // Android specific
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Request permissions on iOS
    requestPermissions: Platform.OS === 'ios',
  });

  // Create default channel for Android (required for Android 8.0+)
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'default-channel-id',
        channelName: 'Default Channel',
        channelDescription: 'Default notification channel',
        playSound: true,
        soundName: 'default',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`📱 [NOTIFICATION] Channel created: ${created}`)
    );
  }
};

// Store retry timeout ID to prevent multiple retries
let retryTimeoutId = null;

/**
 * Cancel any pending notification permission retry
 */
export const cancelNotificationPermissionRetry = () => {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
    console.log('🛑 [NOTIFICATION] Cancelled pending permission retry');
  }
};

/**
 * Request notification permissions with retry mechanism
 * If permission is denied, automatically retries after 1 minute
 * Only requests permission - no actual notifications are sent
 */
export const requestNotificationPermissions = async (isRetry = false) => {
  console.log('📱 [NOTIFICATION] Requesting notification permissions...', isRetry ? '(Retry)' : '(Initial)');
  
  if (Platform.OS === 'android') {
    // Android 13+ (API 33+) requires explicit permission request
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'This app needs notification permission to send you important updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ [NOTIFICATION] Android notification permission granted');
          // Clear any pending retry if permission is granted
          if (retryTimeoutId) {
            clearTimeout(retryTimeoutId);
            retryTimeoutId = null;
          }
        } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
          console.log('❌ [NOTIFICATION] Android notification permission denied');
          // Schedule retry after 1 minute (60000 milliseconds) if not already scheduled
          if (!isRetry && !retryTimeoutId) {
            console.log('⏰ [NOTIFICATION] Scheduling retry after 1 minute...');
            retryTimeoutId = setTimeout(() => {
              retryTimeoutId = null;
              requestNotificationPermissions(true);
            }, 60000); // 1 minute = 60000 milliseconds
          }
        } else {
          // "Ask Me Later" or other response - also retry
          console.log('⏸️ [NOTIFICATION] Android notification permission deferred');
          if (!isRetry && !retryTimeoutId) {
            console.log('⏰ [NOTIFICATION] Scheduling retry after 1 minute...');
            retryTimeoutId = setTimeout(() => {
              retryTimeoutId = null;
              requestNotificationPermissions(true);
            }, 60000);
          }
        }
      } catch (error) {
        console.error('❌ [NOTIFICATION] Error requesting Android notification permission:', error);
      }
    } else {
      // Android 12 and below - permissions are granted automatically
      console.log('📱 [NOTIFICATION] Android < 13 - Permissions granted automatically');
    }
    return;
  }
  
  // iOS: Request permissions
  try {
    const permissions = await PushNotification.requestPermissions();
    console.log('📱 [NOTIFICATION] iOS Permission result:', JSON.stringify(permissions, null, 2));
    
    // Check if permission was denied
    const isDenied = permissions?.alert === false && permissions?.badge === false && permissions?.sound === false;
    
    if (isDenied) {
      console.log('❌ [NOTIFICATION] iOS notification permission denied');
      // Schedule retry after 1 minute if not already scheduled
      if (!isRetry && !retryTimeoutId) {
        console.log('⏰ [NOTIFICATION] Scheduling retry after 1 minute...');
        retryTimeoutId = setTimeout(() => {
          retryTimeoutId = null;
          requestNotificationPermissions(true);
        }, 60000); // 1 minute = 60000 milliseconds
      }
    } else {
      console.log('✅ [NOTIFICATION] iOS notification permission granted');
      // Clear any pending retry if permission is granted
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
    }
  } catch (error) {
    console.error('❌ [NOTIFICATION] Permission request error:', error);
    // Also retry on error
    if (!isRetry && !retryTimeoutId) {
      console.log('⏰ [NOTIFICATION] Scheduling retry after 1 minute due to error...');
      retryTimeoutId = setTimeout(() => {
        retryTimeoutId = null;
        requestNotificationPermissions(true);
      }, 60000);
    }
  }
};

/**
 * Check current notification permissions
 */
export const checkNotificationPermissions = (callback) => {
  PushNotification.checkPermissions(callback);
};

/**
 * Display foreground notification when app is open
 * This is called from FCM onMessage handler
 * @param {Object} remoteMessage - FCM remote message object
 */
export const displayForegroundNotification = (remoteMessage) => {
  try {
    const notification = remoteMessage.notification || {};
    const data = remoteMessage.data || {};
    
    const title = notification.title || data.title || 'Notification';
    const body = notification.body || data.body || data.message || 'You have a new notification';
    
    console.log('🔔 [NOTIFICATION] Displaying foreground notification:', { title, body });

    if (Platform.OS === 'android') {
      PushNotification.localNotification({
        channelId: 'default-channel-id',
        title: title,
        message: body,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        data: data, // Pass custom data
      });
    } else {
      // iOS
      PushNotification.localNotification({
        title: title,
        message: body,
        playSound: true,
        soundName: 'default',
        userInfo: data, // Pass custom data
      });
    }
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error displaying foreground notification:', error);
  }
};

