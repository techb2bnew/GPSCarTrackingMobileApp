import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VinListScreen from '../screens/VinListScreen';
import ParkingDetailsScreen from '../screens/ParkingDetailsScreen';
import AssetMap from '../screens/AssetMap';

const Stack = createNativeStackNavigator();

export default function VinListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VinListScreen" component={VinListScreen}/>
      <Stack.Screen name="ParkingDetailsScreen" component={ParkingDetailsScreen} />
      <Stack.Screen name="AssetMap" component={AssetMap} />

      

    </Stack.Navigator>
  );
}

