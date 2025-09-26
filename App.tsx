// import React, {useEffect, useState} from 'react';
// import {SafeAreaView, StyleSheet, View, Image} from 'react-native';
// import {NavigationContainer} from '@react-navigation/native';
// import MainTabNavigator from './src/navigations/MainTabNavigator';
// import {whiteColor} from './src/constants/Color';
// import {BaseStyle} from './src/constants/Style';
// import {SPLASH_IMAGE} from './src/assests/images';
// import AuthStack from './src/navigations/AuthStack';
// import AnimatedLottieView from 'lottie-react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const {flex, alignItemsCenter, alignJustifyCenter} = BaseStyle;

// function App(): React.JSX.Element {
//   const [showSplash, setShowSplash] = useState(true);
//   const [checkUser, setCheckUser] = useState(null);
// console.log("checkUsercheckUser>>.",checkUser);


//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       setShowSplash(false);
//     }, 4000); // 3 seconds

//     return () => clearTimeout(timeout); // cleanup
//   }, []);
// const getUser = async () => {
//   try {
//     const jsonValue = await AsyncStorage.getItem('user');
//     if (jsonValue != null) {
//       const user = JSON.parse(jsonValue);
//       setCheckUser(user)
//       console.log('Logged in user:', user);
//       return user;
//     } else {
//       console.log('No user found in storage.');
//     }
//   } catch (e) {
//     console.error('Error reading user from storage:', e);
//   }
// };
//   useEffect(() => {
//    getUser()
//   }, []);
//   return (
//     <View style={styles.container}>
//       {showSplash ? (
//         <View style={styles.splashContainer}>
//           <View style={styles.splashContainer}>
//             <AnimatedLottieView
//               source={require('./src/assets/welcome.json')} // 👈 your splash lottie file
//               autoPlay
//               loop // remove loop if you want it to play once
//               style={styles.splashAnimation}
//             />
//           </View>
//           {/* <Image
//             source={SPLASH_IMAGE} // 👈 put your splash image here
//             style={styles.splashImage}
//             // resizeMode="cover"
//           /> */}
//         </View>
//       ) : (
//         <NavigationContainer>
//         {!checkUser ?  <AuthStack />:<MainTabNavigator setCheckUser={setCheckUser} />}
//           {/* <MainTabNavigator /> */}
//         </NavigationContainer>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: whiteColor,
//   },
//   splashContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: whiteColor,
//   },
//   splashImage: {
//     width: '100%',
//     height: '100%',
//   },
//    splashAnimation: {
//     width: 300, // adjust as per your design
//     height: 300,
//   },
// });

// export default App;
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

const { flex, alignItemsCenter, alignJustifyCenter } = BaseStyle;

function AppContent({ setCheckUser }) {
  const [showSplash, setShowSplash] = useState(true);
  const userData = useSelector(state => state.user.userData);
console.log("userDatauserData",userData);

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

