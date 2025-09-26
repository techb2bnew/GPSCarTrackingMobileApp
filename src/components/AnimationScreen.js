import React from 'react';
import {View, StyleSheet} from 'react-native';
import LottieView from 'lottie-react-native';
import logout from '../assets/logout.json';

export default function AnimationScreen() {
  return (
    <View style={styles.container}>
      <LottieView
        source={logout}
        autoPlay
        loop
        style={{width: 200, height: 200}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
