import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// Configure push notification
// IMPORTANT: We're only using LOCAL notifications, not Firebase/FCM
// Android: Skip configure to avoid Firebase error - local notifications work without configure
// iOS: Configure is needed for proper notification handling
if (Platform.OS === 'ios') {
  try {
    const notificationConfig = {
      // Disable Firebase/FCM since we're only using local notifications
      onRegister: function (token) {
        console.log('📱 [NOTIFICATION] Device Token:', token);
      },
      onNotification: function (notification) {
        console.log('📱 [NOTIFICATION] Notification received:', notification);
        // Handle notification tap if needed
        // Fix for iOS: Check if notification exists and has properties
        if (notification && notification.userInteraction) {
          console.log('📱 [NOTIFICATION] User tapped notification');
        }
      },
      onAction: function (notification) {
        // Fix for iOS: Check if notification exists
        if (notification && notification.action) {
          console.log('📱 [NOTIFICATION] Action:', notification.action);
        }
      },
      onRegistrationError: function (err) {
        console.error('❌ [NOTIFICATION] Registration error:', err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true, // iOS needs permission request
    };

    PushNotification.configure(notificationConfig);
    console.log('✅ [NOTIFICATION] Configured successfully for iOS');
  } catch (error) {
    console.warn('⚠️ [NOTIFICATION] Configure warning:', error?.message || error);
  }
} else {
  // Android: Don't call configure - it tries to initialize Firebase
  // Local notifications work without configure on Android
  console.log('✅ [NOTIFICATION] Android - Using local notifications without configure (Firebase not needed)');
}

// Create notification channel for Android 8+ (only on Android)
if (Platform.OS === 'android') {
  try {
    PushNotification.createChannel(
      {
        channelId: 'chip_motion_channel',
        channelName: 'Chip Motion Alerts',
        channelDescription: 'Notifications for chip movement detection',
        playSound: true,
        soundName: 'default',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`📱 [NOTIFICATION] Channel created: ${created}`)
    );
  } catch (error) {
    console.warn('⚠️ [NOTIFICATION] Channel creation warning:', error?.message || error);
  }
}

/**
 * Show chip motion notification
 * @param {Object} chipData - { chipId, chipDetails, location, timestamp }
 */
export const showChipMotionNotification = (chipData) => {
  try {
    const { chipId, chipDetails, location, timestamp } = chipData;
    
    // Format timestamp
    const formatTimestamp = (ts) => {
      if (!ts) return "No time available";
      try {
        const date = typeof ts === 'number'
          ? (ts < 10000000000 ? new Date(ts * 1000) : new Date(ts))
          : new Date(ts);
        return date.toLocaleString();
      } catch (error) {
        return "Invalid timestamp";
      }
    };
    
    // Build notification message (same as alert)
    let message = '';
    if (chipDetails) {
      // Chip found in database - show full details (same as alert)
      message = `Chip ID: ${chipId}\n`;
      message += `Status: Movement Started\n`;
      message += `Time: ${formatTimestamp(timestamp)}\n\n`;
      
      message += `📋 Vehicle Details:\n`;
      message += `VIN: ${chipDetails.vin}\n`;
      message += `Make: ${chipDetails.make}\n`;
      message += `Model: ${chipDetails.model}\n`;
      message += `Year: ${chipDetails.year}\n`;
      message += `Yard: ${chipDetails.yardName}\n`;
      if (chipDetails.batteryLevel !== 'N/A') {
        message += `Battery: ${chipDetails.batteryLevel}%\n`;
      }
    } else {
      // Chip not found - show basic info (same as alert)
      message = `Chip ID: ${chipId}\n`;
      message += `Status: Movement Started\n`;
      message += `Time: ${formatTimestamp(timestamp)}\n\n`;
      message += `⚠️ New chip detected - not found in database\n`;
    }
    
    // Add location if available (same as alert)
    if (location && location.latitude && location.longitude) {
      message += `\n📍 Location:\n`;
      message += `Latitude: ${location.latitude.toFixed(6)}\n`;
      message += `Longitude: ${location.longitude.toFixed(6)}\n`;
      if (location.source) {
        message += `Source: ${location.source === 'chip_gps' ? 'Chip GPS' : 'Device GPS'}`;
      }
    } else {
      message += `\n⚠️ Location not available`;
    }

    // Build notification config
    // Generate unique ID for notification (so multiple notifications can be saved)
    const notificationId = `chip_motion_${chipId}_${timestamp || Date.now()}`;
    
    const notificationConfig = {
      id: notificationId, // Unique ID so notification persists in tray
      title: '🚨 Chip Movement Detected!',
      message: message,
      playSound: true,
      soundName: 'default',
      userInfo: {
        chipId: chipId,
        timestamp: timestamp || Date.now(),
        type: 'chip_motion',
      },
    };

    // Android specific config
    if (Platform.OS === 'android') {
      notificationConfig.channelId = 'chip_motion_channel';
      notificationConfig.importance = 'high';
      notificationConfig.priority = 'high';
      notificationConfig.vibrate = true;
      notificationConfig.vibration = 300;
      notificationConfig.visibility = 'public';
      notificationConfig.color = '#613EEA';
      notificationConfig.autoCancel = false; // Keep notification in tray until user dismisses
      notificationConfig.ongoing = false; // Not ongoing, but persistent
    }

    // iOS specific config
    if (Platform.OS === 'ios') {
      notificationConfig.alert = true;
      notificationConfig.badge = true;
      notificationConfig.sound = 'default';
      notificationConfig.category = 'chip_motion'; // Category for grouping
    }

    // Show notification
    console.log(`\n📱 [NOTIFICATION] Showing chip motion notification...`);
    console.log(`   Title: ${notificationConfig.title}`);
    console.log(`   Message length: ${message.length} characters`);
    console.log(`   Platform: ${Platform.OS}`);
    console.log(`   Config:`, JSON.stringify(notificationConfig, null, 2));
    
    try {
      PushNotification.localNotification(notificationConfig);
      console.log('✅ [NOTIFICATION] Chip motion notification shown successfully');
    } catch (notifError) {
      console.error('❌ [NOTIFICATION] Error in localNotification call:', notifError);
      console.error('❌ [NOTIFICATION] Error details:', JSON.stringify(notifError, null, 2));
    }
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error showing notification:', error);
  }
};

/**
 * Test notification function
 */
export const showTestNotification = () => {
  try {
    // Helper function to show notification
    const showNotification = () => {
      const notificationConfig = {
        title: '🧪 Test Notification',
        message: 'This is a test notification to check if notifications are working!',
        playSound: true,
        soundName: 'default',
        userInfo: {
          type: 'test',
          timestamp: Date.now(),
        },
      };

      // Android specific config
      if (Platform.OS === 'android') {
        notificationConfig.channelId = 'chip_motion_channel';
        notificationConfig.importance = 'high';
        notificationConfig.priority = 'high';
        notificationConfig.vibrate = true;
        notificationConfig.vibration = 300;
        // Android notification visibility
        notificationConfig.visibility = 'public';
        // Android notification color (optional)
        notificationConfig.color = '#613EEA';
        // Android notification auto cancel
        notificationConfig.autoCancel = true;
      }

      // iOS specific config
      if (Platform.OS === 'ios') {
        notificationConfig.alert = true;
        notificationConfig.badge = true;
        notificationConfig.sound = 'default';
        // iOS needs these for foreground notifications
        notificationConfig.userInteraction = false;
      }

      PushNotification.localNotification(notificationConfig);
      console.log('✅ [NOTIFICATION] Test notification shown');
      console.log('📱 [NOTIFICATION] Platform:', Platform.OS);
      console.log('📱 [NOTIFICATION] Config:', JSON.stringify(notificationConfig, null, 2));
    };

    // First check permissions
    PushNotification.checkPermissions((permissions) => {
      console.log('📱 [NOTIFICATION] Current permissions:', JSON.stringify(permissions, null, 2));
      
      // Check if permissions are granted
      const hasPermission = Platform.OS === 'ios' 
        ? permissions?.alert === 1 || permissions?.alert === true
        : permissions?.alert === true;

      if (!hasPermission) {
        console.warn('⚠️ [NOTIFICATION] Permission not granted! Requesting...');
        PushNotification.requestPermissions().then((newPermissions) => {
          console.log('📱 [NOTIFICATION] New permissions:', JSON.stringify(newPermissions, null, 2));
          // Try again after permission request
          showNotification();
        });
        return;
      }

      // Show notification
      showNotification();
    });
  } catch (error) {
    console.error('❌ [NOTIFICATION] Error showing test notification:', error);
    console.error('❌ [NOTIFICATION] Error details:', JSON.stringify(error, null, 2));
  }
};

/**
 * Request notification permissions
 * Only for local notifications - no Firebase/FCM needed
 */
export const requestNotificationPermissions = () => {
  console.log('📱 [NOTIFICATION] Requesting permissions for LOCAL notifications only...');
  
  // Android: Permissions are handled automatically, no need to request
  if (Platform.OS === 'android') {
    console.log('📱 [NOTIFICATION] Android - Permissions handled automatically');
    return;
  }
  
  // iOS: Request permissions
  try {
    PushNotification.requestPermissions().then((permissions) => {
      console.log('📱 [NOTIFICATION] Permission result:', JSON.stringify(permissions, null, 2));
    }).catch((error) => {
      console.error('❌ [NOTIFICATION] Permission request error:', error);
    });
  } catch (error) {
    console.warn('⚠️ [NOTIFICATION] Permission request warning:', error?.message || error);
  }
};

/**
 * Check current notification permissions
 */
export const checkCurrentPermissions = () => {
  PushNotification.checkPermissions((permissions) => {
    console.log('📱 [NOTIFICATION] Current permissions:', JSON.stringify(permissions, null, 2));
  });
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

/**
 * Get notification permissions status
 */
export const checkNotificationPermissions = (callback) => {
  PushNotification.checkPermissions(callback);
};

export default PushNotification;

