// CustomTabBar.js

import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const PRIMARY_COLOR = '#613EEA';
const SECONDARY_COLOR = '#fff';

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {state?.routes?.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconSource = options.tabBarIcon
          ? options.tabBarIcon({ focused: isFocused })
          : null;

        return (
          <AnimatedTouchableOpacity
            layout={LinearTransition.springify().mass(0.5)}
            key={route.key}
            onPress={onPress}
            style={[
              styles.tabItem,
              { backgroundColor: isFocused ? SECONDARY_COLOR : 'transparent' },
            ]}
          >
            {iconSource}
            {isFocused && (
              <Animated.Text
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={[styles.text]}
              >
                {label}
              </Animated.Text>
            )}
          </AnimatedTouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#613EEA",
    width: '80%',
    alignSelf: 'center',
    bottom: 40,
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tabItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 30,
  },
  text: {
    color: PRIMARY_COLOR,
    marginLeft: 8,
    fontWeight: '500',
  },
});
