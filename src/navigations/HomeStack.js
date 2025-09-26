import React from 'react';
import {
  createNativeStackNavigator,
  TransitionPresets,
} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import NotificationScreen from '../screens/NotificationScreen';
import MapViewScreen from '../screens/MapViewScreen';
import AuthStack from './AuthStack';
import LoginScreen from '../screens/LoginScreen';
import ActivityHistoryScreen from '../screens/ActivityHistoryScreen';
import SearchScreen from '../screens/SearchScreen';
import YardDetailsScreen from '../screens/YardDetailsScreen';
import ActiveChipScreen from '../screens/ActiveChipScreen';
import ARNavigationScreen from '../screens/ARNavigationScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack({setCheckUser}) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // ...TransitionPresets?.SlideFromRightIOS,
      }}
      initialRouteName="HomeScreen">
      <Stack.Screen name="HomeScreen">
        {props => <HomeScreen {...props} setCheckUser={setCheckUser} />}
      </Stack.Screen>
      {/* <Stack.Screen name="HomeScreen" component={HomeScreen} setCheckUser={setCheckUser} /> */}
      <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      <Stack.Screen
        name="ActivityHistoryScreen"
        component={ActivityHistoryScreen}
      />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="YardDetailsScreen" component={YardDetailsScreen} />
      <Stack.Screen name="ActiveChipScreen" component={ActiveChipScreen} />
      <Stack.Screen name="ARNavigationScreen" component={ARNavigationScreen} />
      <Stack.Screen
        name="NotificationScreen"
        component={NotificationScreen}
        options={{
          gestureDirection: 'vertical',
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {duration: 500},
            },
            close: {
              animation: 'timing',
              config: {duration: 500},
            },
          },
          cardStyleInterpolator: ({current, layouts}) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-layouts.screen.height, 0], // 👈 top to normal
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
      {/* <Stack.Screen name="AuthStack" component={AuthStack} /> */}
    </Stack.Navigator>
  );
}
