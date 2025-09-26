import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapViewScreen from '../screens/MapViewScreen';


const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapViewScreen" component={MapViewScreen} />
    </Stack.Navigator>
  );
}
