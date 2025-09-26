import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanScreen from '../screens/ScanScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ParkingHistory from '../screens/ParkingHistory';
import NotificationScreen from '../screens/NotificationScreen';
import ValidIDScreen from '../screens/ValidIDScreen';
import EditConnection from '../screens/EditConnection';


const Stack = createNativeStackNavigator();

export default function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}  initialRouteName="ScanScreen">
      <Stack.Screen name="ScanScreen" component={ScanScreen} />
      <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
        <Stack.Screen name="ParkingHistory" component={ParkingHistory} />
        <Stack.Screen name="EditConnection" component={EditConnection} />

        <Stack.Screen name="NotificationScreen" component={NotificationScreen}  options={{
          gestureDirection: 'vertical',
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 500 },
            },
            close: {
              animation: 'timing',
              config: { duration: 500 },
            },
          },
          cardStyleInterpolator: ({ current, layouts }) => {
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
        }} />
        <Stack.Screen name="ValidIDScreen" component={ValidIDScreen} />


    </Stack.Navigator>
  );
}
