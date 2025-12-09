import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { INTRO_1 } from '../../assests/images';
import { spacings, style } from '../../constants/Fonts';
import { nissanPrimaryBlue } from '../../constants/Color';

const { width, height } = Dimensions.get('window');

const RelaxView = () => {
  // Animation controllers
  const animationProgress = useSharedValue(0);

  // Start animation on mount
  React.useEffect(() => {
    animationProgress.value = withTiming(1, { duration: 2000 });
  }, []);

  // Animated styles
  const titleAnimStyle = useAnimatedStyle(() => {
    const translateY = interpolate(animationProgress.value, [0, 1], [-50, 0]);
    return {
      transform: [{ translateY }],
      opacity: animationProgress.value,
    };
  });

  const subtitleAnimStyle = useAnimatedStyle(() => {
    const translateX = interpolate(animationProgress.value, [0, 1], [width, 0]);
    return {
      transform: [{ translateX }],
      opacity: animationProgress.value,
    };
  });

  const imageAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(animationProgress.value, [0, 1], [0.8, 1]);
    return {
      transform: [{ scale }],
      opacity: animationProgress.value,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={INTRO_1}
        style={[styles.image, imageAnimStyle]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.title, titleAnimStyle]}>
        Best Parking Spots
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, subtitleAnimStyle]}>
        Find the best parking spots near you with real-time availability and easy navigation.
      </Animated.Text>
    </View>
  );
};

export default RelaxView;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.7,
    height: height * 0.4,
    marginBottom: 20,
  },
  title: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: nissanPrimaryBlue,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#888',
    textAlign: 'center',
  },
});
