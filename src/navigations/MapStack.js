import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapViewScreen from '../screens/MapViewScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import ParkingSlotsScreen from '../screens/ParkingSlotsScreen';


const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      <Stack.Screen name="VehicleDetailsScreen" component={VehicleDetailsScreen} /> */}
      <Stack.Screen name="ParkingSlotsScreen" component={ParkingSlotsScreen} />
    </Stack.Navigator>
  );
}
