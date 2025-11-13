import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_DENIAL_COUNT_KEY = 'location_permission_denial_count';
const MAX_DENIAL_COUNT = 3;

/**
 * Check if location permission is granted (without requesting)
 */
export const checkLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return hasPermission;
    } else {
      // For iOS, try to get position with very short timeout to check permission
      // This won't trigger permission request if not determined
      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          () => {
            // Got position = permission granted
            resolve(true);
          },
          (error) => {
            // Error code 1 = permission denied
            // Other errors might mean not determined or other issues
            if (error.code === 1) {
              resolve(false);
            } else {
              // Timeout or other error - likely not determined, so false
              resolve(false);
            }
          },
          { timeout: 500, maximumAge: 0 }
        );
      });
    }
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Get denial count from storage
 */
const getDenialCount = async () => {
  try {
    const count = await AsyncStorage.getItem(PERMISSION_DENIAL_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Error getting denial count:', error);
    return 0;
  }
};

/**
 * Increment denial count
 */
const incrementDenialCount = async () => {
  try {
    const currentCount = await getDenialCount();
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(PERMISSION_DENIAL_COUNT_KEY, newCount.toString());
    return newCount;
  } catch (error) {
    console.error('Error incrementing denial count:', error);
    return 0;
  }
};

/**
 * Reset denial count (when permission is granted)
 */
const resetDenialCount = async () => {
  try {
    await AsyncStorage.removeItem(PERMISSION_DENIAL_COUNT_KEY);
  } catch (error) {
    console.error('Error resetting denial count:', error);
  }
};

/**
 * Request location permission with retry logic
 * @param {Object} options - Configuration options
 * @param {string} options.title - Alert title
 * @param {string} options.message - Alert message
 * @param {Function} options.onGranted - Callback when permission is granted
 * @param {Function} options.onDenied - Callback when permission is denied
 * @returns {Promise<boolean>} - True if permission granted, false otherwise
 */
export const requestLocationPermission = async (options = {}) => {
  const {
    title = 'Location Permission',
    message = 'This app needs access to your location to show your position on the map.',
    onGranted = null,
    onDenied = null,
  } = options;

  try {
    if (Platform.OS === 'android') {
      // Check if already granted
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (hasPermission) {
        await resetDenialCount();
        if (onGranted) onGranted();
        return true;
      }

      // Get current denial count
      const denialCount = await getDenialCount();

      // If already denied 3 times, show message and don't ask again
      if (denialCount >= MAX_DENIAL_COUNT) {
        Alert.alert(
          'Location Permission Required',
          'Location permission is required for this app to function properly. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
        if (onDenied) onDenied(denialCount);
        return false;
      }

      // Request permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title,
          message,
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        await resetDenialCount();
        if (onGranted) onGranted();
        return true;
      } else {
        const newDenialCount = await incrementDenialCount();
        
        // If denied 3 times, show final message
        if (newDenialCount >= MAX_DENIAL_COUNT) {
          Alert.alert(
            'Location Permission Required',
            'Location permission is required for this app to function properly. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                },
              },
            ]
          );
        }
        
        if (onDenied) onDenied(newDenialCount);
        return false;
      }
    } else {
      // iOS permission handling
      try {
        // First check current status
        let status;
        try {
          status = await Geolocation.requestAuthorization('whenInUse');
        } catch (authError) {
          console.log('iOS: requestAuthorization not available, checking via getCurrentPosition');
          // Fallback: try to get position to trigger permission
          return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
              () => {
                // Permission granted
                resetDenialCount();
                if (onGranted) onGranted();
                resolve(true);
              },
              (error) => {
                // Permission denied or error
                if (error.code === 1) {
                  // Permission denied
                  incrementDenialCount().then((newDenialCount) => {
                    if (newDenialCount >= MAX_DENIAL_COUNT) {
                      Alert.alert(
                        'Location Permission Required',
                        'Location permission is required for this app to function properly. Please enable it in Settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Open Settings',
                            onPress: () => {
                              Linking.openSettings();
                            },
                          },
                        ]
                      );
                    }
                    if (onDenied) onDenied(newDenialCount);
                    resolve(false);
                  });
                } else {
                  // Other error
                  if (onDenied) onDenied(0);
                  resolve(false);
                }
              },
              { timeout: 1000 }
            );
          });
        }
        
        if (status === 'granted') {
          await resetDenialCount();
          if (onGranted) onGranted();
          return true;
        } else if (status === 'denied' || status === 'restricted') {
          const newDenialCount = await incrementDenialCount();
          
          // If denied 3 times, show final message
          if (newDenialCount >= MAX_DENIAL_COUNT) {
            Alert.alert(
              'Location Permission Required',
              'Location permission is required for this app to function properly. Please enable it in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => {
                    Linking.openSettings();
                  },
                },
              ]
            );
          }
          
          if (onDenied) onDenied(newDenialCount);
          return false;
        } else {
          // 'notDetermined' - should not happen after requestAuthorization
          if (onDenied) onDenied(0);
          return false;
        }
      } catch (error) {
        console.error('Error requesting iOS location permission:', error);
        const newDenialCount = await incrementDenialCount();
        if (onDenied) onDenied(newDenialCount);
        return false;
      }
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    const newDenialCount = await incrementDenialCount();
    if (onDenied) onDenied(newDenialCount);
    return false;
  }
};

/**
 * Check if we should show permission request (not denied 3 times)
 */
export const shouldRequestPermission = async () => {
  const denialCount = await getDenialCount();
  return denialCount < MAX_DENIAL_COUNT;
};

