import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, AppState, Image, Text, ActivityIndicator, ImageBackground } from 'react-native';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import MainTabNavigator from './src/navigations/MainTabNavigator';
import AuthStack from './src/navigations/AuthStack';
import AnimatedLottieView from 'lottie-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, interpolate, Easing } from 'react-native-reanimated';
import { whiteColor, nissanPrimaryBlue } from './src/constants/Color';
import { BaseStyle } from './src/constants/Style';
import InternetChecker from './src/components/InternetChecker';
import { MAIN_LOGO, SPLASH_IMAGE, NISSAN_LOGO } from './src/assests/images';
import { requestLocationPermission } from './src/utils/locationPermission';
import { listenAllChipsMotionEvents } from './src/utils/motionEventListener';
import { requestNotificationPermissions, configurePushNotifications, displayForegroundNotification } from './src/utils/notificationService';
import messaging from '@react-native-firebase/messaging';
import { getFCMToken, saveFCMTokenToDatabase } from './src/utils/fcmTokenManager';
import { addNotification } from './src/redux/notificationsSlice';
import { loadAndClearBackgroundNotifications, saveBackgroundNotification } from './src/utils/backgroundNotificationStorage';
import { SafeAreaView } from 'react-native-safe-area-context';
import crashlytics from '@react-native-firebase/crashlytics';

const { flex, alignItemsCenter, alignJustifyCenter } = BaseStyle;

interface RootState {
  user: {
    userData: any;
  };
  notifications: {
    items: any[];
  };
}

interface AppContentProps {
  setCheckUser: (user: any) => void;
}

function AppContent({ setCheckUser }: AppContentProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [navigationReady, setNavigationReady] = useState(false);
  const userData = useSelector((state: RootState) => state.user.userData);
  const dispatch = useDispatch();
  const tokenSaveInProgress = useRef(false);
  const lastTokenSaveTime = useRef(0);
  const navigationRef = useNavigationContainerRef();
  console.log("userDatauserData", userData);

  // Initialize Crashlytics
  useEffect(() => {
    const initializeCrashlytics = async () => {
      try {
        // Enable crash collection
        await crashlytics().setCrashlyticsCollectionEnabled(true);
        console.log('✅ [CRASHLYTICS] Crashlytics initialized');
      } catch (error) {
        console.error('❌ [CRASHLYTICS] Error initializing Crashlytics:', error);
      }
    };
    initializeCrashlytics();
  }, []);

  // Set user identification when user logs in
  useEffect(() => {
    if (userData && userData.id) {
      try {
        crashlytics().setUserId(userData.id.toString());
        if (userData.email) {
          crashlytics().setAttribute('user_email', userData.email);
        }
        if (userData.name) {
          crashlytics().setAttribute('user_name', userData.name);
        }
        console.log('✅ [CRASHLYTICS] User identification set:', userData.email || userData.id);
      } catch (error) {
        console.error('❌ [CRASHLYTICS] Error setting user identification:', error);
      }
    } else {
      // Clear user identification on logout
      try {
        crashlytics().setUserId('');
        crashlytics().setAttribute('user_email', '');
        crashlytics().setAttribute('user_name', '');
      } catch (error) {
        console.error('❌ [CRASHLYTICS] Error clearing user identification:', error);
      }
    }
  }, [userData]);

  // Track current screen name for crash reports
  const handleNavigationStateChange = useCallback(() => {
    try {
      if (navigationRef && navigationRef.isReady()) {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute) {
          const screenName = currentRoute.name || 'Unknown';
          crashlytics().setAttribute('current_screen', screenName);
          console.log('📍 [CRASHLYTICS] Screen tracked:', screenName);
        }
      }
    } catch (error) {
      console.error('❌ [CRASHLYTICS] Error tracking screen:', error);
    }
  }, [navigationRef]);

  // Animation values for splash screen
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    if (showSplash) {
      // Start animations
      logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
      logoOpacity.value = withTiming(1, { duration: 800 });
      // Delay text animation using setTimeout
      setTimeout(() => {
        textOpacity.value = withTiming(1, { duration: 600 });
      }, 400);
      // Progress bar animation - fills from 0 to 100% over 3.5 seconds
      progressValue.value = withTiming(100, { duration: 3500, easing: Easing.linear });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      // Reset progress when splash is hidden
      progressValue.value = 0;
    }
  }, [showSplash]);

  // Request location permission on app startup
  useEffect(() => {
    const requestPermissionOnStartup = async () => {
      try {
        await requestLocationPermission({
          title: 'Location Permission',
          message: 'This app needs access to your location to show your position on the map.',
          onGranted: () => { },
          onDenied: () => { },
        });
      } catch (error) {
        const err: any = error;
        console.error('Error requesting location permission on startup:', err?.message || err);
      }
    };

    // Request permission after a short delay to let app initialize
    const permissionTimeout = setTimeout(() => {
      requestPermissionOnStartup();
    }, 1000);

    return () => clearTimeout(permissionTimeout);
  }, []);

  // Configure and request notification permissions on app startup
  useEffect(() => {
    const notificationTimeout = setTimeout(async () => {
      console.log('📱 [APP] Configuring push notifications...');
      try {
        // Configure push notifications first
        configurePushNotifications();
        // Then request permissions (async function)
        await requestNotificationPermissions();
      } catch (error) {
        const err: any = error;
        console.warn('⚠️ [APP] Notification setup warning:', err?.message || err);
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(notificationTimeout);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    setCheckUser(userData);
  }, [userData]);

  // Start monitoring all chips motion events when user is logged in
  useEffect(() => {
    let mqttClient: any = null;

    if (userData && !showSplash) {
      console.log('🚀 [APP] Starting all chips motion monitoring...');
      listenAllChipsMotionEvents()
        .then((client) => {
          mqttClient = client;
          console.log('✅ [APP] All chips motion monitoring started');
        })
        .catch((error) => {
          console.error('❌ [APP] Error starting motion monitoring:', error);
        });
    }

    // Cleanup on unmount or when user logs out
    return () => {
      if (mqttClient) {
        console.log('🛑 [APP] Stopping all chips motion monitoring...');
        mqttClient.end();
      }
    };
  }, [userData, showSplash]);
  // Listen for FCM messages when app is in foreground
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📨 [FCM] Foreground message received:', JSON.stringify(remoteMessage));

      // Display notification even when app is open
      displayForegroundNotification(remoteMessage);

      try {
        const notification = remoteMessage.notification || {};
        const data = remoteMessage.data || {};
        const title = notification.title || data.title || 'Notification';
        const body =
          notification.body || data.body || data.message || 'You have a new notification';

        dispatch(
          addNotification({
            title,
            body,
            data,
          }),
        );
      } catch (error) {
        console.error('❌ [APP] Error adding foreground notification to store:', error);
      }
    });

    return unsubscribe;
  }, []);

  // Function to sync background notifications to Redux
  const syncBackgroundNotifications = useCallback(async () => {
    try {
      console.log('🔄 [APP] Starting background notification sync...');
      const pending = await loadAndClearBackgroundNotifications();
      if (pending && pending.length > 0) {
        console.log(
          '📨 [APP] Syncing',
          pending.length,
          'background notifications into Redux',
        );
        pending.forEach(item => {
          console.log('📨 [APP] Adding notification:', item.title);
          dispatch(
            addNotification({
              title: item.title,
              body: item.body,
              data: item.data || {},
            }),
          );
        });
        console.log('✅ [APP] Background notifications synced successfully');
      } else {
        console.log('📨 [APP] No pending background notifications to sync');
      }
    } catch (error) {
      console.error(
        '❌ [APP] Error syncing background notifications:',
        error,
      );
    }
  }, [dispatch]);

  // Load any background notifications saved while app was not active (on mount)
  useEffect(() => {
    syncBackgroundNotifications();
  }, [syncBackgroundNotifications]);

  // Listen for app state changes to sync background notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 [APP] AppState changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('📱 [APP] App came to foreground, syncing background notifications...');
        // Add a small delay to ensure app is fully active
        setTimeout(() => {
          syncBackgroundNotifications();
        }, 500);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [syncBackgroundNotifications]);

  // Handle notifications received in background and opened by the user
  useEffect(() => {
    // When app is in background and user taps on a notification
    const unsubscribeFromOpened = messaging().onNotificationOpenedApp(
      async remoteMessage => {
        if (!remoteMessage) {
          return;
        }
        console.log(
          '📨 [FCM] Notification opened from background:',
          JSON.stringify(remoteMessage),
        );
        try {
          const notification = remoteMessage.notification || {};
          const data = remoteMessage.data || {};
          const title = notification.title || data.title || 'Notification';
          const body =
            notification.body ||
            data.body ||
            data.message ||
            'You have a new notification';

          // Save this notification to storage first (in case it wasn't saved before)
          console.log('💾 [FCM] Saving notification that was opened from background...');
          await saveBackgroundNotification(remoteMessage);

          // Add to Redux
          dispatch(
            addNotification({
              title,
              body,
              data,
            }),
          );

          // Also sync any other pending background notifications
          await syncBackgroundNotifications();
        } catch (error) {
          console.error(
            '❌ [APP] Error adding background-opened notification to store:',
            error,
          );
        }
      },
    );

    // When app was completely closed and opened by tapping a notification
    messaging()
      .getInitialNotification()
      .then(async remoteMessage => {
        console.log('📨 [FCM] Checking initial notification...');
        if (!remoteMessage) {
          // Even if no initial notification, sync any pending background notifications
          console.log('📨 [FCM] No initial notification, syncing pending background notifications...');
          // Add delay to ensure app is fully initialized
          setTimeout(async () => {
            await syncBackgroundNotifications();
          }, 1000);
          return;
        }
        console.log(
          '📨 [FCM] App opened from quit state by notification:',
          JSON.stringify(remoteMessage),
        );
        try {
          const notification = remoteMessage.notification || {};
          const data = remoteMessage.data || {};
          const title = notification.title || data.title || 'Notification';
          const body =
            notification.body ||
            data.body ||
            data.message ||
            'You have a new notification';

          // Save this notification to storage first (in case it wasn't saved before)
          console.log('💾 [FCM] Saving initial notification...');
          await saveBackgroundNotification(remoteMessage);

          // Add to Redux
          dispatch(
            addNotification({
              title,
              body,
              data,
            }),
          );

          // Also sync any other pending background notifications
          setTimeout(async () => {
            await syncBackgroundNotifications();
          }, 1000);
        } catch (error) {
          console.error(
            '❌ [APP] Error adding initial notification to store:',
            error,
          );
        }
      });

    return unsubscribeFromOpened;
  }, [dispatch, syncBackgroundNotifications]);

  // Get FCM token on app start
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getFCMToken();
        if (token) {
          console.log('📱 [APP] FCM Token fetched on app start');
          // Token will be saved when user logs in (see useEffect below)
        }
      } catch (error) {
        console.error('❌ [APP] Error getting FCM token on app start:', error);
      }
    };

    fetchToken();
  }, []);

  // Save FCM token to database when user logs in (with debounce to prevent duplicates)
  useEffect(() => {
    const saveTokenForUser = async () => {
      if (userData && userData.id && !showSplash) {
        // Prevent duplicate calls within 3 seconds
        const now = Date.now();
        if (tokenSaveInProgress.current || (now - lastTokenSaveTime.current < 3000)) {
          console.log('⏸️ [APP] Token save already in progress or too recent, skipping...');
          return;
        }

        tokenSaveInProgress.current = true;
        try {
          console.log('💾 [APP] User logged in, saving FCM token...');
          const token = await getFCMToken();
          if (token) {
            await saveFCMTokenToDatabase(userData.id.toString(), token);
            lastTokenSaveTime.current = Date.now();
          }
        } catch (error) {
          console.error('❌ [APP] Error saving FCM token for logged in user:', error);
        } finally {
          tokenSaveInProgress.current = false;
        }
      }
    };

    // Add a small delay to avoid race condition with LoginScreen
    const timeout = setTimeout(() => {
      saveTokenForUser();
    }, 2000); // 2 second delay after user login

    return () => clearTimeout(timeout);
  }, [userData, showSplash]);

  // Listen for token refresh and update database
  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 [FCM] Token refreshed:', newToken);
      if (userData && userData.id) {
        try {
          await saveFCMTokenToDatabase(userData.id.toString(), newToken);
          console.log('✅ [FCM] Refreshed token saved to database');
        } catch (error) {
          console.error('❌ [FCM] Error saving refreshed token:', error);
        }
      }
    });

    return unsubscribe;
  }, [userData]);

  // ============================================
  // TEST CRASHLYTICS - Uncomment to test automatic crash
  // ============================================
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     console.log('🧪 [TEST] Triggering test crash in 5 seconds...');
  //     crashlytics().setAttribute('test_crash', 'true');
  //     crashlytics().log('Test crash triggered automatically from App.tsx');
  //     crashlytics().crash();
  //   }, 5000);

  //   return () => clearTimeout(timer);
  // }, []);


  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  return (
    <View style={styles.container}>
      <InternetChecker navigationRef={navigationRef} navigationReady={navigationReady} />
      {showSplash ? (
        <View style={styles.splashContainer}>
          {/* Nissan logo – splash pe sahi se dikhane ke liye */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Image
              source={NISSAN_LOGO}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.splashSubtitle}>Track Your Vehicles</Text>
            <Text style={styles.splashSubtitle}>Monitor & Manage Anytime</Text>
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, progressBarStyle]} />
          </View>

          {/* OPTION 2: Pulse Animation - Uncomment to use */}
          {/* <Animated.View style={[styles.pulseContainer, pulseAnimatedStyle]}>
            <Image
              source={MAIN_LOGO}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.splashText}>Loading...</Text> */}

          {/* OPTION 3: Lottie Animation (welcomeww.json) - Uncomment to use */}
          {/* <AnimatedLottieView
            source={require('./src/assets/welcomeww.json')}
            autoPlay
            loop
            style={styles.splashAnimation}
          /> */}

          {/* OPTION 4: Successfully Animation - Uncomment to use */}
          {/* <AnimatedLottieView
            source={require('./src/assets/successfully.json')}
            autoPlay
            loop
            style={styles.splashAnimation}
          /> */}

          {/* OPTION 5: Background Image with Logo - Uncomment to use */}
          {/* <ImageBackground
            source={SPLASH_IMAGE}
            style={styles.splashBackground}
            resizeMode="cover"
          >
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <Image
                source={MAIN_LOGO}
                style={styles.logoOverlay}
                resizeMode="contain"
              />
            </Animated.View>
          </ImageBackground> */}

          {/* OPTION 6: Minimal Loading - Uncomment to use */}
          {/* <View style={styles.minimalContainer}>
            <ActivityIndicator size="large" color={nissanPrimaryBlue} />
            <Text style={styles.minimalText}>Loading...</Text>
          </View> */}
        </View>
      ) : (
        Platform.OS === 'android' ? (
          <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer 
              ref={navigationRef}
              onReady={() => {
                setNavigationReady(true);
                handleNavigationStateChange();
              }}
              onStateChange={handleNavigationStateChange}>
              {!userData ? <AuthStack /> : <MainTabNavigator setCheckUser={setCheckUser} />}
            </NavigationContainer>
          </SafeAreaView>
        ) : (
          <NavigationContainer 
            ref={navigationRef}
            onReady={() => {
              setNavigationReady(true);
              handleNavigationStateChange();
            }}
            onStateChange={handleNavigationStateChange}>
            {!userData ? <AuthStack /> : <MainTabNavigator setCheckUser={setCheckUser} />}
          </NavigationContainer>
        )
      )}
    </View>
  );
}

export default function App() {
  const [checkUser, setCheckUser] = useState(null);

  return (
    // <SafeAreaView style={{flex:1}}>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent setCheckUser={setCheckUser} />
      </PersistGate>
    </Provider>
    // </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: whiteColor,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: whiteColor,
  },
  splashAnimation: {
    width: 300,
    height: 300,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  splashLogo: {
    width: 200,
    height: 200,
    maxWidth: '80%',
    maxHeight: 200,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: nissanPrimaryBlue,
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  loader: {
    marginTop: 30,
  },
  progressBarContainer: {
    width: '70%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 40,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: nissanPrimaryBlue,
    borderRadius: 2,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 18,
    color: nissanPrimaryBlue,
    marginTop: 20,
    fontWeight: '600',
  },
  splashBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    width: 200,
    height: 200,
  },
  minimalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalText: {
    marginTop: 20,
    fontSize: 16,
    color: nissanPrimaryBlue,
    fontWeight: '500',
  },
});

