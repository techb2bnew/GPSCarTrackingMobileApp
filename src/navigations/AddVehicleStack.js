import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddVehicleScreen from '../screens/AddVehicleScreen';
import ScannerScreen from '../screens/ScannerScreen';
import YardDetailScreen from '../screens/YardDetailScreen';
import TextScanScreen from '../screens/TextScanScreen';

const Stack = createNativeStackNavigator();

export default function AddVehicleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AddVehicleScreen">
      <Stack.Screen name="AddVehicleScreen" component={AddVehicleScreen} />
      <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
      <Stack.Screen name="TextScanScreen" component={TextScanScreen} />
      <Stack.Screen name="YardDetailScreen" component={YardDetailScreen} />
    </Stack.Navigator>
  );
}
