import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParkingHistory from '../screens/ParkingHistory';
import NotificationScreen from '../screens/NotificationScreen';
import ValidIDScreen from '../screens/ValidIDScreen';
import EditConnection from '../screens/EditConnection';


const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParkingHistory" component={ParkingHistory} />
      <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
      <Stack.Screen name="ValidIDScreen" component={ValidIDScreen} />
      <Stack.Screen name="EditConnection" component={EditConnection} />
    </Stack.Navigator>
  );
}
