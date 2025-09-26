import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import NotificationScreen from '../screens/NotificationScreen';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import RegisterScreen from '../screens/RegisterScreen';
import IntroductionAnimationScreen from '../screens/IntroductionAnimationScreen';
import ForgetPasswordFlow from '../screens/ForgetPasswordFlow';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="IntroductionAnimationScreen" component={IntroductionAnimationScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgetPasswordFlow" component={ForgetPasswordFlow} />
      <Stack.Screen name="mainscreens" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
