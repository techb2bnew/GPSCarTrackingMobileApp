import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pending_background_notifications';

export const saveBackgroundNotification = async remoteMessage => {
  try {
    console.log('💾 [BACKGROUND_NOTIF] Saving background notification:', JSON.stringify(remoteMessage));
    const notification = remoteMessage?.notification || {};
    const data = remoteMessage?.data || {};

    const title = notification.title || data.title || 'Notification';
    const body =
      notification.body || data.body || data.message || 'You have a new notification';

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      body,
      data,
      receivedAt: new Date().toISOString(),
    };

    console.log('💾 [BACKGROUND_NOTIF] Notification item created:', newItem);

    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    console.log('💾 [BACKGROUND_NOTIF] Existing notifications count:', existing.length);

    existing.unshift(newItem);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    console.log('✅ [BACKGROUND_NOTIF] Background notification saved successfully. Total count:', existing.length);
  } catch (error) {
    console.error('❌ [BACKGROUND_NOTIF] Error saving background notification:', error);
  }
};

export const loadAndClearBackgroundNotifications = async () => {
  try {
    console.log('📥 [BACKGROUND_NOTIF] Loading background notifications from storage...');
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingRaw) {
      console.log('📥 [BACKGROUND_NOTIF] No background notifications found in storage');
      return [];
    }
    const items = JSON.parse(existingRaw);
    console.log('📥 [BACKGROUND_NOTIF] Found', items.length, 'background notifications');
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('✅ [BACKGROUND_NOTIF] Background notifications loaded and cleared from storage');
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('❌ [BACKGROUND_NOTIF] Error loading background notifications:', error);
    return [];
  }
};

// Debug function to check what's in storage without clearing it
export const checkBackgroundNotifications = async () => {
  try {
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingRaw) {
      return [];
    }
    const items = JSON.parse(existingRaw);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('❌ [BACKGROUND_NOTIF] Error checking background notifications:', error);
    return [];
  }
};


