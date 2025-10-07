import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParkingYardScreen from '../screens/ParkingYardScreen';
import YardDetailsScreen from '../screens/YardDetailsScreen';
import ParkingDetailsScreen from '../screens/ParkingDetailsScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import YardDetailScreen from '../screens/YardDetailScreen';
import ScannerScreen from '../screens/ScannerScreen';

const Stack = createNativeStackNavigator();

export default function ParkingYardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParkingYardScreen" component={ParkingYardScreen} />
      <Stack.Screen name="YardDetailsScreen" component={YardDetailsScreen} />
      <Stack.Screen name="ParkingDetailsScreen" component={ParkingDetailsScreen} />
      <Stack.Screen name="VehicleDetailsScreen" component={VehicleDetailsScreen} />
      <Stack.Screen name="YardDetailScreen" component={YardDetailScreen} />
      <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
    </Stack.Navigator>
  );
}