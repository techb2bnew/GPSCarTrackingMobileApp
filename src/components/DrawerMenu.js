import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedLottieView from 'lottie-react-native';
import { heightPercentageToDP, widthPercentageToDP } from '../utils';
import { useDispatch } from 'react-redux';
import { clearUser } from '../redux/userSlice';
import { whiteColor } from '../constants/Color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllChips } from '../utils/chipManager';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function DrawerMenu({
  isOpen,
  onClose,
  user,
  navigation,
  setCheckUser,
}) {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleOpenLogoutModal = () => {
    setShowModal(true);
    setIsLoggingOut(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear all AsyncStorage data
      
      // 1. Clear all chip data (active & inactive)
      await clearAllChips();
      console.log('✅ Cleared all chip data');
      
      // 2. Clear all parking yards
      await AsyncStorage.removeItem('parking_yards');
      console.log('✅ Cleared parking yards');
      
      // 3. Clear all yard vehicles
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      for (const key of yardKeys) {
        await AsyncStorage.removeItem(key);
      }
      console.log(`✅ Cleared ${yardKeys.length} yard vehicle data`);
      
      // 4. Clear all chip locations
      const chipLocationKeys = keys.filter(key => key.startsWith('chip_'));
      for (const key of chipLocationKeys) {
        await AsyncStorage.removeItem(key);
      }
      console.log(`✅ Cleared ${chipLocationKeys.length} chip locations`);
      
      // 5. Clear user data from Redux
      dispatch(clearUser());
      console.log('✅ User data cleared from Redux');
      
      // 6. Clear user data from AsyncStorage
      await AsyncStorage.removeItem('user');
      console.log('✅ User data cleared from AsyncStorage');
      
      console.log('🎉 All data cleared successfully on logout');
    } catch (error) {
      console.error('❌ Error clearing data on logout:', error);
    }
    setShowModal(false);
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  // Drawer slide animation
  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -DRAWER_WIDTH, { duration: 400 });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[styles.drawer, animatedStyle]}
      // prevent touches from bubbling to any parent/backdrop that might fade
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => false}
    >
      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={1}
      >
        <Ionicons name="close" size={28} color="black" />
      </TouchableOpacity>

      {/* Profile */}
      <View style={styles.profileContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name 
              ? user.name.charAt(0).toUpperCase()
              : 'U'}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.name 
            ? user.name.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')
            : 'User'}
        </Text>
      </View>

      {/* Menu items */}
      <View style={styles.menuItems}>
        {[
          { label: 'Profile', icon: 'person', nav: 'ProfileScreen' },
          { label: 'Facility History', icon: 'time', nav: 'ActivityHistoryScreen' },
          { label: 'How it works', icon: 'information-circle' },
          // { label: 'Support', icon: 'help-circle' },
          // { label: 'Settings', icon: 'settings' },
        ].map((item, idx) => (
          // OUTER ROW is a plain View => empty area is NOT clickable
          <View key={idx} style={styles.menuItem}>
            {/* Only this compact area is touchable (no fade) */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.menuTap}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => {
                if (item.nav) navigation?.navigate(item.nav);
                onClose(); // if you want to close after navigation
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color="black"
                style={{ marginRight: 10 }}
              />
              <Text>{item.label}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Logout (same compact tap) */}
      <View style={styles.logout}>
        <TouchableOpacity
          style={styles.menuTap}
          onPress={handleOpenLogoutModal}
          activeOpacity={1}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#613EEA"
            style={{ marginRight: 10 }}
          />
          <Text style={{ color: '#613EEA' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Modal (unchanged look) */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          {/* Use Pressable for backdrop tap (never TouchableOpacity here) */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
          <View style={styles.modalContent}>
            <AnimatedLottieView
              source={require('../assets/logout.json')}
              autoPlay
              loop
              style={{ width: 180, height: 180 }}
            />
            <Text style={{ fontSize: 16, marginBottom: 20 }}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogout}
                activeOpacity={1}
              >
                <Text style={{ color: 'white' }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'grey' }]}
                onPress={() => setShowModal(false)}
                activeOpacity={1}
              >
                <Text style={{ color: 'white' }}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: whiteColor,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 999999999,
    elevation: 12,
    height: heightPercentageToDP(100),
  },
  closeButton: { alignSelf: 'flex-start' },

  profileContainer: { alignItems: 'center', marginVertical: 20 },
  avatar: { 
    height: 80, 
    width: 80, 
    borderRadius: 40, 
    backgroundColor: '#613EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: { marginTop: 10, fontWeight: 'bold', fontSize: 16 },

  menuItems: { marginTop: 30 },

  // OUTER row is NOT touchable
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },

  // ONLY this compact area is touchable
  menuTap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start', // so tap area is just content width
  },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'baseline',
    position: 'absolute',
    bottom: heightPercentageToDP(4),
    left: 20,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});
