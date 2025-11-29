import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

/**
 * Get FCM token from Firebase
 * @returns {Promise<string|null>} FCM token or null if error
 */
export const getFCMToken = async () => {
  try {
    // iOS ke liye pehle register karo
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    console.log('✅ [FCM] Token fetched:', token);
    return token;
  } catch (error) {
    console.error('❌ [FCM] Error getting FCM token:', error);
    return null;
  }
};

/**
 * Save FCM token to Supabase database
 * @param {string} userId - User ID from staff table
 * @param {string} fcmToken - FCM token to save
 * @returns {Promise<boolean>} Success status
 */
export const saveFCMTokenToDatabase = async (userId, fcmToken) => {
  try {
    if (!userId || !fcmToken) {
      console.warn('⚠️ [FCM] Missing userId or fcmToken');
      return false;
    }

    console.log('💾 [FCM] Saving token to database for user:', userId);

    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

    // Check if same token already exists for this user (don't check is_active, just check token)
    const { data: existingToken, error: sameTokenError } = await supabase
      .from('user_fcm_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('fcm_token', fcmToken)
      .maybeSingle();

    if (sameTokenError && sameTokenError.code !== 'PGRST116') {
      console.error('❌ [FCM] Error checking same token:', sameTokenError);
    }

    // If same token already exists, just update timestamp - don't touch is_active field
    if (existingToken) {
      console.log('✅ [FCM] Same token already exists, updating timestamp only...');
      
      // Update existing token: only update timestamp and device_type, keep is_active as is
      const { error: updateError } = await supabase
        .from('user_fcm_tokens')
        .update({
          device_type: deviceType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('❌ [FCM] Error updating existing token:', updateError);
        return false;
      }

      console.log('✅ [FCM] Existing token timestamp updated successfully');
      return true;
    }

    // Token doesn't exist, so insert new token
    console.log('➕ [FCM] Inserting new token...');
    const { error: insertError } = await supabase
      .from('user_fcm_tokens')
      .insert({
        user_id: userId,
        fcm_token: fcmToken,
        device_type: deviceType,
        is_active: true,
      });

    if (insertError) {
      console.error('❌ [FCM] Error inserting token:', insertError);
      return false;
    }

    console.log('✅ [FCM] Token saved successfully');
    return true;
  } catch (error) {
    console.error('❌ [FCM] Exception saving token:', error);
    return false;
  }
};

/**
 * Get FCM token and save to database for a user
 * This is a convenience function that combines getFCMToken and saveFCMTokenToDatabase
 * @param {string} userId - User ID from staff table
 * @returns {Promise<boolean>} Success status
 */
export const getAndSaveFCMToken = async (userId) => {
  try {
    const token = await getFCMToken();
    if (!token) {
      console.warn('⚠️ [FCM] Could not get FCM token');
      return false;
    }
    return await saveFCMTokenToDatabase(userId, token);
  } catch (error) {
    console.error('❌ [FCM] Error in getAndSaveFCMToken:', error);
    return false;
  }
};

