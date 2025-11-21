import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapViewScreen from '../screens/MapViewScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import ParkingSlotsScreen from '../screens/ParkingSlotsScreen';
import YardListScreen from '../screens/YardListScreen';
import YardPolygonsMapScreen from '../screens/YardPolygonsMapScreen';


const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* First screen - Yard List */}
      <Stack.Screen name="YardListScreen" component={YardListScreen} />
      {/* Second screen - Map view with polygons */}
      <Stack.Screen name="YardPolygonsMapScreen" component={YardPolygonsMapScreen} />
      {/* Other screens */}
      {/* <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
      <Stack.Screen name="VehicleDetailsScreen" component={VehicleDetailsScreen} /> */}
      <Stack.Screen name="ParkingSlotsScreen" component={ParkingSlotsScreen} />
    </Stack.Navigator>
  );
}
