import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';

const InternetChecker = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const appState = useRef(AppState.currentState);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const hideTimeout = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Initial check - but don't show banner on first load if connected
    checkInitialConnection();

    // Subscribe to network state changes
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      
      // Only show banner if connection changed to disconnected
      if (!connected && isConnected) {
        setIsConnected(false);
        showInternetBanner();
      } else if (connected && !isConnected) {
        setIsConnected(true);
        setShowBanner(false);
      }
    });

    // Subscribe to app state changes (when app comes to foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        checkInternetConnection();
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubscribeNetInfo();
      subscription.remove();
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [isConnected]);

  const checkInitialConnection = async () => {
    const state = await NetInfo.fetch();
    const connected = state.isConnected && state.isInternetReachable !== false;
    setIsConnected(connected);
    
    // Only show banner if actually disconnected on initial load
    if (!connected) {
      showInternetBanner();
    }
    
    // Mark that initial mount is complete
    setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);
  };

  const checkInternetConnection = async () => {
    const state = await NetInfo.fetch();
    const connected = state.isConnected && state.isInternetReachable !== false;
    
    if (!connected && isConnected) {
      setIsConnected(false);
      showInternetBanner();
    } else if (connected && !isConnected) {
      setIsConnected(true);
      setShowBanner(false);
    }
  };

  const showInternetBanner = () => {
    setShowBanner(true);
    
    // Animate banner sliding down
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto hide after 5 seconds
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    hideTimeout.current = setTimeout(() => {
      hideBanner();
    }, 5000);
  };

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowBanner(false);
    });
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Icon name="error" size={24} color="#FF3B30" style={styles.icon} />
        <Text style={styles.text}>
          No Internet. Please check your internet connection. Internet is required.
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 50, // Space for status bar
    paddingBottom: 15,
    paddingHorizontal: 15,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
    fontWeight: '500',
  },
});

export default InternetChecker;

