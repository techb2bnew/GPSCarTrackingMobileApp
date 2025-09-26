// import React from 'react';
// import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
// import HomeStack from './HomeStack';
// import ParkingYardStack from './ParkingYardStack';
// import VinListStack from './VinListStack';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // You can also use Ionicons, FontAwesome etc.
// import {blackColor, whiteColor} from '../constants/Color';
// import {heightPercentageToDP} from '../utils';
// import {
//   HISTORY,
//   HISTORY_FOCUSED,
//   HOME,
//   HOME_FOCUSED,
//   HOME_FOCUSED_IMAGE,
//   HOME_UNFOCUSED_IMAGE,
//   MAP,
//   MAP_FOCUSED,
//   PARKING,
//   PARKING_FOCUSED,
//   PARKING_FOCUSED_IMAGE,
//   PARKING_UNFOCUSED_IMAGE,
//   SCANNER,
//   VIN_FOCUSED_IMAGE,
//   VIN_UNFOCUSED_IMAGE,
// } from '../assests/images';
// import {Image, Text} from 'react-native';
// import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
// import MapStack from './MapStack';
// import HistoryStack from './HistoryStack';
// import ScanStack from './ScanStack';

// const Tab = createBottomTabNavigator();

// export default function MainTabNavigator() {
//   const getTabBarVisibility = route => {
//     const routeName = getFocusedRouteNameFromRoute(route) ?? '';
//     const hideOnScreens = ['ParkingDetailsScreen'];
//     if (hideOnScreens.includes(routeName)) {
//       return 'none';
//     }
//     return 'flex';
//   };
//   return (
//     <Tab.Navigator
//       screenOptions={({route}) => ({
//         headerShown: false,
//         tabBarStyle: {
//           // display: getTabBarVisibility(route),
//           backgroundColor: '#FFF',
//           alignItems: 'center',
//           justifyContent: 'center',
//         },
//         tabBarLabel: ({focused}) => {
//           let label = '';
//           if (route.name === 'Home') label = 'Home';
//           else if (route.name === 'Map') label = 'Map';
//           else if (route.name === 'Scan') label = 'Scan';
//           else if (route.name === 'History') label = 'History';
//           else if (route.name === 'Facility') label = 'Facility';
//           else if (route.name === 'Search') label = 'Search VIN';

//           return (
//             <Text
//               style={{
//                 color: focused ? '#5F93FB' : 'black',
//                 fontSize: 12,
//                 fontWeight: '600',
//                 marginTop: 10,
//               }}>
//               {label}
//             </Text>
//           );
//         },
//         tabBarIcon: ({focused}) => {
//           let iconName;
//           if (route.name === 'Home') {
//             iconName = focused ? HOME_FOCUSED: HOME;
//           } else if (route.name === 'Map') {
//             iconName = focused
//               ? MAP_FOCUSED
//               : MAP;
//           } else if (route.name === 'Scan') {
//             iconName = focused ? SCANNER : SCANNER;
//           } else if (route.name === 'History') {
//             iconName = focused
//               ? HISTORY
//               : HISTORY_FOCUSED;
//           } else if (route.name === 'Facility') {
//             iconName = focused
//               ? PARKING_FOCUSED
//               : PARKING;
//           } else if (route.name === 'Search') {
//             iconName = focused ? VIN_FOCUSED_IMAGE : VIN_UNFOCUSED_IMAGE;
//           }

//           return (
//             <Image
//               source={iconName}
//               style={{
//                 width: 28,
//                 height: 28,
//                 marginTop: 10,
//                 resizeMode: 'contain',
//               }}
//             />
//           );
//         },
//       })}>
//       <Tab.Screen
//         name="Home"
//         component={HomeStack}
//         listeners={({navigation, route}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'Home');
//             if (currentRoute?.state?.index > 0) {
//               // Reset stack if not on first screen
//               navigation.navigate('Home', {
//                 screen: 'Home', // 👈 your initial screen name in HomeStack
//               });
//             }
//           },
//         })}
//       />
//       <Tab.Screen
//         name="Map"
//         component={MapStack}
//         listeners={({navigation, route}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'Map');
//             if (currentRoute?.state?.index > 0) {
//               // Reset stack if not on first screen
//               navigation.navigate('Map', {
//                 screen: 'Map', // 👈 your initial screen name in HomeStack
//               });
//             }
//           },
//         })}
//       />
//       <Tab.Screen
//         name="Scan"
//         component={ScanStack}
//         listeners={({navigation}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'Scan');
//             if (currentRoute?.state?.index > 0) {
//               navigation.navigate('Scan', {
//                 screen: 'Scan', // 👈 initial screen of your JobHistoryStack
//               });
//             }
//           },
//         })}
//       />
//       <Tab.Screen
//         name="History"
//         component={HistoryStack}
//         listeners={({navigation}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'History');
//             if (currentRoute?.state?.index > 0) {
//               navigation.navigate('History', {
//                 screen: 'History', // 👈 initial screen of your JobHistoryStack
//               });
//             }
//           },
//         })}
//       />
//       <Tab.Screen
//         name="Facility"
//         component={ParkingYardStack}
//         listeners={({navigation}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'History');
//             if (currentRoute?.state?.index > 0) {
//               navigation.navigate('Facility', {
//                 screen: 'Facility', // 👈 initial screen of your JobHistoryStack
//               });
//             }
//           },
//         })}
//       />
//       {/* <Tab.Screen
//         name="Search"
//         component={VinListStack}
//         listeners={({navigation}) => ({
//           tabPress: e => {
//             const state = navigation.getState();
//             const currentRoute = state.routes.find(r => r.name === 'Search');
//             if (currentRoute?.state?.index > 0) {
//               navigation.navigate('Search', {
//                 screen: 'Search', // 👈 initial screen of your JobHistoryStack
//               });
//             }
//           },
//         })}
//       /> */}
//     </Tab.Navigator>
//   );
// }

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeStack from './HomeStack';
import ParkingYardStack from './ParkingYardStack';
import MapStack from './MapStack';
import HistoryStack from './HistoryStack';
import ScanStack from './ScanStack';
import CustomTabBar from '../components/CustomTabBar';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import {
  CommonActions,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator({setCheckUser}) {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconComponent;

          if (route.name === 'Home') {
            iconComponent = (
              <Feather
                name="home"
                size={22}
                color={focused ? '#613EEA' : 'white'}
              />
            );
          } else if (route.name === 'Map') {
            iconComponent = (
              <Ionicons
                name="map-outline"
                size={22}
                color={focused ? '#613EEA' : 'white'}
              />
            );
          } else if (route.name === 'Scan') {
            iconComponent = (
              <Ionicons
                name="qr-code"
                size={22}
                color={focused ? '#613EEA' : 'white'}
              />
            );
          } else if (route.name === 'History') {
            iconComponent = (
              <Feather
                name="clock"
                size={22}
                color={focused ? '#613EEA' : 'white'}
              />
            );
          } else if (route.name === 'Facility') {
            iconComponent = (
              <Ionicons
                name="car-sport-outline"
                size={27}
                color={focused ? '#613EEA' : 'white'}
              />
            );
          }

          return iconComponent;
        },

        tabBarLabel: route.name,
      })}>
      <Tab.Screen
        name="Home"
        options={({route}) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? '';
          console.log('routeName:::', routeName);

          if (routeName == 'AuthStack') {
            return {
              tabBarStyle: {display: 'none', backgroundColor: 'red'},
            };
          }
          return {
            tabBarStyle: {display: 'flex'},
          };
        }}
        listeners={({navigation}) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'Home'}],
              }),
            );
          },
        })}>
        {() => <HomeStack setCheckUser={setCheckUser} />}
      </Tab.Screen>

      <Tab.Screen name="Map" component={MapStack} />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            // Prevent default behaviour
            e.preventDefault();
            // Reset the stack to HomeScreen
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'Scan'}], // 'Home' is your Tab name
              }),
            );
          },
        })}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        listeners={({navigation}) => ({
          tabPress: e => {
            // Prevent default behaviour
            e.preventDefault();
            // Reset the stack to HomeScreen
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: 'History'}], // 'Home' is your Tab name
              }),
            );
          },
        })}
      />
      <Tab.Screen name="Facility" component={ParkingYardStack} />
      {/* <Tab.Screen name="Search" component={VinListStack} /> */}
    </Tab.Navigator>
  );
}
