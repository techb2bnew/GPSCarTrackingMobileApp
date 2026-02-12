// Utility to check if staff account exists and is active in Supabase
// This will auto-logout if admin deletes the staff account

import { supabase } from '../lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllAsyncStorageData } from './chipManager';
import { clearUser } from '../redux/userSlice';
import Toast from 'react-native-simple-toast';

/**
 * Check if staff account still exists and is active in Supabase
 * @param {string} email - Staff email
 * @param {number} staffId - Staff ID
 * @returns {Promise<{exists: boolean, isActive: boolean, data: object|null}>}
 */
export const checkStaffAccount = async (email, staffId) => {
  try {
    console.log('🔍 [StaffValidation] Checking staff account:', { email, staffId });

    // Check by email first
    const { data: emailData, error: emailError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();

    // If found by email, check if it matches the staffId
    if (emailData && !emailError) {
      if (staffId && emailData.id !== staffId) {
        // Email exists but ID doesn't match (shouldn't happen, but safety check)
        console.log('⚠️ [StaffValidation] Email found but ID mismatch');
        return { exists: false, isActive: false, data: null };
      }
      console.log('✅ [StaffValidation] Staff found:', { exists: true, isActive: emailData.status === 'Active' });
      return {
        exists: true,
        isActive: emailData.status === 'Active',
        data: emailData,
      };
    }

    // If not found by email, check by ID
    if (staffId) {
      const { data: idData, error: idError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single();

      if (idData && !idError) {
        console.log('✅ [StaffValidation] Staff found by ID:', { exists: true, isActive: idData.status === 'Active' });
        return {
          exists: true,
          isActive: idData.status === 'Active',
          data: idData,
        };
      }
    }

    // Staff not found in database (deleted by admin)
    console.log('❌ [StaffValidation] Staff not found in database - account deleted');
    return { exists: false, isActive: false, data: null };
  } catch (error) {
    console.error('❌ [StaffValidation] Error checking staff account:', error);
    // On error, assume account exists to avoid false logouts
    return { exists: true, isActive: true, data: null };
  }
};

/**
 * Auto-logout if staff account is deleted or inactive
 * Clears all data and navigates to login
 * @param {object} navigation - Navigation object
 * @param {function} dispatch - Redux dispatch function
 * @param {boolean} isDeleted - Whether account was deleted (true) or just inactive (false)
 */
export const handleAutoLogout = async (navigation, dispatch, isDeleted = false) => {
  try {
    console.log('🚪 [StaffValidation] Auto-logout triggered - staff account deleted or inactive');

    // Show toast message only when account is deleted
    if (isDeleted) {
      Toast.show('Your account has been deleted. You are being logged out.', Toast.LONG);
    }

    // Clear all AsyncStorage data
    const clearResult = await clearAllAsyncStorageData();
    console.log(`✅ [StaffValidation] Cleared ${clearResult.clearedKeys} AsyncStorage keys`);

    // Clear Redux user data
    if (dispatch) {
      dispatch(clearUser());
    }

    // Small delay to show toast before navigation
    setTimeout(() => {
      // Navigate to login screen
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }, isDeleted ? 1500 : 0); // Wait 1.5 seconds if deleted to show toast
  } catch (error) {
    console.error('❌ [StaffValidation] Error during auto-logout:', error);
  }
};
