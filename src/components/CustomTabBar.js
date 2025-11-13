// CustomTabBar.js

import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { spacings, style } from '../constants/Fonts';
import { widthPercentageToDP } from '../utils';

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
            layout={Platform.OS === 'ios' ? LinearTransition.springify().mass(0.5) : undefined}
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
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: "#613EEA",
    width: Platform.OS === 'ios' ? widthPercentageToDP(85) : '90%',
    alignSelf: 'center',
    bottom: Platform.OS === 'ios' ? 40 : 10,
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  tabItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 16,
    borderRadius: 30,
    },
  text: {
    color: PRIMARY_COLOR,
    marginLeft: 8,
    fontWeight: style.fontWeightThin1x.fontWeight,
    fontSize: style.fontSizeSmall.fontSize,
  },
});
