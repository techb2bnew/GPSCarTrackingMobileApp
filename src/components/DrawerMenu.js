import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimationScreen from './AnimationScreen';
import AnimatedLottieView from 'lottie-react-native';
import {widthPercentageToDP} from '../utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch} from 'react-redux';
import {clearUser} from '../redux/userSlice';
// import AnimationScreen from './AnimationScreen';

const {width, height} = Dimensions.get('window');
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

  // const handleLogout = () => {
  //   setIsLoggingOut(true);
  //   // simulate logout delay
  //   navigation.navigate('AuthStack');
  //   setShowModal(false);
  //   setTimeout(() => {
  //     setShowModal(false);
  //     // reset isLoggingOut AFTER modal fully closes
  //     setTimeout(() => {
  //       setIsLoggingOut(false);
  //     }, 500); // adjust if needed
  //     console.log('Logged out successfully');

  //     // Perform actual logout here
  //   }, 3000);
  // };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // await AsyncStorage.removeItem('user');
      dispatch(clearUser());
      console.log('User data removed from AsyncStorage');
      // setCheckUser(null);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
    setShowModal(false);
    // navigation.navigate('AuthStack');
    setTimeout(() => {
      setIsLoggingOut(false);
    }, 500);
  };

  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -DRAWER_WIDTH, {duration: 400});
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <Animated.View style={[styles.drawer, animatedStyle]}>
      {/* Close button */}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={28} color="black" />
      </TouchableOpacity>

      {/* Profile */}
      <View style={styles.profileContainer}>
        <Image
          source={{
            uri: user?.image || 'https://randomuser.me/api/portraits/men/1.jpg',
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.name || 'Mark Evans'}</Text>
      </View>

      {/* Menu items */}
      <View style={styles.menuItems}>
        {[
          {label: 'Facility History', icon: 'time'},
          {label: 'How it works', icon: 'information-circle'},
          {label: 'Support', icon: 'help-circle'},
          {label: 'Settings', icon: 'settings'},
        ].map((item, idx) => (
          <TouchableOpacity
            onPress={() => {
              if (item.label === 'Facility History') {
                navigation.navigate('ActivityHistoryScreen');
              }
              // add other navigation if needed
            }}
            key={idx}
            style={styles.menuItem}>
            <Ionicons
              name={item.icon}
              size={20}
              color="black"
              style={{marginRight: 10}}
            />
            <Text>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logout} onPress={handleOpenLogoutModal}>
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#613EEA"
          style={{marginRight: 10}}
        />
        <Text style={{color: '#613EEA'}}>Logout</Text>
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <>
              <AnimatedLottieView
                source={require('../assets/logout.json')}
                autoPlay
                loop
                style={{width: 180, height: 180}}
              />
            </>
            <>
              <Text style={{fontSize: 16, marginBottom: 20}}>
                Are you sure you want to log out?
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleLogout}>
                  <Text style={{color: 'white'}}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, {backgroundColor: 'grey'}]}
                  onPress={() => setShowModal(false)}>
                  <Text style={{color: 'white'}}>No</Text>
                </TouchableOpacity>
              </View>
            </>
            {/* )} */}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: -50,
    bottom: 0,
    left: -20,
    width: DRAWER_WIDTH,
    backgroundColor: 'white',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 999999999,
    elevation: 10,
    height: 780,
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  profileContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
  },
  name: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuItems: {
    marginTop: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  logout: {
    flexDirection: 'row',
    marginTop: 300,
    alignItems: 'center',
    alignSelf: 'baseline',
  },

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

// export default  DrawerMenu;
