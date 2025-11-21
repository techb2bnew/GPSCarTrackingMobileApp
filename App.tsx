import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { NavigationContainer } from '@react-navigation/native';
import MainTabNavigator from './src/navigations/MainTabNavigator';
import AuthStack from './src/navigations/AuthStack';
import AnimatedLottieView from 'lottie-react-native';
import { whiteColor } from './src/constants/Color';
import { BaseStyle } from './src/constants/Style';
import InternetChecker from './src/components/InternetChecker';
import { requestLocationPermission } from './src/utils/locationPermission';
import { listenAllChipsMotionEvents } from './src/utils/motionEventListener';
import { requestNotificationPermissions } from './src/utils/notificationService';

const { flex, alignItemsCenter, alignJustifyCenter } = BaseStyle;

function AppContent({ setCheckUser }) {
  const [showSplash, setShowSplash] = useState(true);
  const userData = useSelector(state => state.user.userData);
console.log("userDatauserData",userData);

  // Request location permission on app startup
  useEffect(() => {
    const requestPermissionOnStartup = async () => {
      try {
        await requestLocationPermission({
          title: 'Location Permission',
          message: 'This app needs access to your location to show your position on the map.',
        });
      } catch (error) {
        console.error('Error requesting location permission on startup:', error);
      }
    };

    // Request permission after a short delay to let app initialize
    const permissionTimeout = setTimeout(() => {
      requestPermissionOnStartup();
    }, 1000);

    return () => clearTimeout(permissionTimeout);
  }, []);

  // Request notification permission on app startup (with delay to avoid Firebase error)
  useEffect(() => {
    // Delay notification service initialization to avoid Firebase error on Android
    const notificationTimeout = setTimeout(() => {
      console.log('📱 [APP] Requesting notification permissions...');
      try {
        requestNotificationPermissions();
      } catch (error) {
        console.warn('⚠️ [APP] Notification permission request warning:', error?.message || error);
        // Continue even if there's an error - local notifications will still work
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

  return (
    <View style={styles.container}>
      <InternetChecker />
      {showSplash ? (
        <View style={styles.splashContainer}>
          <AnimatedLottieView
            source={require('./src/assets/welcome.json')}
            autoPlay
            loop
            style={styles.splashAnimation}
          />
        </View>
      ) : (
        <NavigationContainer>
          {!userData ? <AuthStack /> : <MainTabNavigator setCheckUser={setCheckUser} />}
        </NavigationContainer>
      )}
    </View>
  );
}

export default function App() {
  const [checkUser, setCheckUser] = useState(null);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent setCheckUser={setCheckUser} />
      </PersistGate>
    </Provider>
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
});

