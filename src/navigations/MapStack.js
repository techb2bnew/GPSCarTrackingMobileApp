import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapViewScreen from '../screens/MapViewScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';


const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      <Stack.Screen name="VehicleDetailsScreen" component={VehicleDetailsScreen} />
    </Stack.Navigator>
  );
}
