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

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    setCheckUser(userData);
  }, [userData]);

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

