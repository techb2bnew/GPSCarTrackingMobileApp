import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { INTRO_2 } from '../../assests/images';
import { spacings, style } from '../../constants/Fonts';

const { width, height } = Dimensions.get('window');

const IMAGE_WIDTH = width * 0.7;

const CareView = ({ triggerAnimation }) => {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    if (triggerAnimation) {
      animationProgress.value = withTiming(1, { duration: 1000 });
    }
  }, [triggerAnimation]);

  // Title animation: slide in from left
  const titleAnimStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animationProgress.value,
      [0, 1],
      [-width, 0],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateX }], opacity: animationProgress.value };
  });

  // Image animation: slide in from bottom
  const imageAnimStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [height * 0.5, 0],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateY }], opacity: animationProgress.value };
  });

  return (
    <Animated.View style={styles.container}>
      <Animated.Image
        source={INTRO_2}
        style={[styles.image, imageAnimStyle]}
        resizeMode="contain"
      />

      <Animated.Text style={[styles.title, titleAnimStyle]}>
        Quick Navigation
      </Animated.Text>

      <Animated.Text style={styles.subtitle}>
        Navigate quickly to your destination with smart routing and live traffic updates.
      </Animated.Text>
    </Animated.View>
  );
};

export default CareView;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  image: {
    width: IMAGE_WIDTH,
    height: height * 0.4,
    marginBottom: 20,
  },
  title: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#130057',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#888',
    textAlign: 'center',
  },
});
