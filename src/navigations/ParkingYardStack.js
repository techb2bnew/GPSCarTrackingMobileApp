import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParkingYardScreen from '../screens/ParkingYardScreen';
import YardDetailsScreen from '../screens/YardDetailsScreen';
import ParkingDetailsScreen from '../screens/ParkingDetailsScreen';

const Stack = createNativeStackNavigator();

export default function ParkingYardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParkingYardScreen" component={ParkingYardScreen} />
      <Stack.Screen name="YardDetailsScreen" component={YardDetailsScreen} />
      <Stack.Screen name="ParkingDetailsScreen" component={ParkingDetailsScreen} />
    </Stack.Navigator>
  );
}