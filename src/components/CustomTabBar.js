// CustomTabBar.js – cradle/swoosh curve jaisa reference, Search center mein elevated

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { style } from '../constants/Fonts';
import { widthPercentageToDP } from '../utils';
import { nissanPrimaryBlue, whiteColor } from '../constants/Color';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const CENTER_TAB_NAME = 'Scan';
const CENTER_BUTTON_SIZE = 66;
const BAR_HEIGHT = 58;
const SIDE_ICON_COLOR = whiteColor;
const SIDE_ICON_FOCUSED = nissanPrimaryBlue;

const BAR_WIDTH = widthPercentageToDP(90);

// Cradle curve path – reference jaisa deep U-shaped scoop, smooth sides
const getCradleBarPath = (w, h) => {
  const r = 32;
  const cx = w / 2;
  const circleR = 33; // Search button radius
  const cradleW = circleR * 3.9; // Slightly wider than circle
  const cradleDepth = 33.5; // Deep U, reference jaisa
  const left = cx - cradleW / 2;
  const right = cx + cradleW / 2;
  const c1x = left + cradleW * 0.25;
  const c2x = right - cradleW * 0.25;
  // Cubic bezier for smooth scoop – left curve down, right curve up
  return `
    M ${r} 0
    L ${left} 0
    C ${c1x} 0 ${c1x} ${cradleDepth} ${cx} ${cradleDepth}
    C ${c2x} ${cradleDepth} ${c2x} 0 ${right} 0
    L ${w - r} 0
    Q ${w} 0 ${w} ${r}
    L ${w} ${h - r}
    Q ${w} ${h} ${w - r} ${h}
    L ${r} ${h}
    Q 0 ${h} 0 ${h - r}
    L 0 ${r}
    Q 0 0 ${r} 0
    Z
  `;
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const routes = state?.routes ?? [];

  const onPress = (route) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    const isFocused = state.index === routes.findIndex((r) => r.key === route.key);
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    const label =
      options.tabBarLabel !== undefined
        ? options.tabBarLabel
        : options.title !== undefined
          ? options.title
          : route.name;
    const isFocused = state.index === index;

    const iconSource = options.tabBarIcon
      ? options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? SIDE_ICON_FOCUSED : SIDE_ICON_COLOR,
        })
      : null;

    return (
      <AnimatedTouchableOpacity
        layout={Platform.OS === 'ios' ? LinearTransition.springify().mass(0.5) : undefined}
        key={route.key}
        onPress={() => onPress(route)}
        style={[styles.tabItem, isFocused && styles.tabItemFocused]}
      >
        {iconSource}
        {isFocused && (
          <Animated.Text
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.tabLabel}
          >
            {label}
          </Animated.Text>
        )}
      </AnimatedTouchableOpacity>
    );
  };

  const centerRoute = routes.find((r) => r?.name === CENTER_TAB_NAME);

  return (
    <View style={styles.wrapper}>
      <View style={styles.barContainer}>
        {/* SVG bar with cradle curve – reference jaisa swoosh */}
        <Svg
          width={BAR_WIDTH}
          height={BAR_HEIGHT}
          style={styles.barSvg}
        >
          <Path
            d={getCradleBarPath(BAR_WIDTH, BAR_HEIGHT)}
            fill={nissanPrimaryBlue}
          />
        </Svg>
        {/* Tab content overlay */}
        <View style={styles.barContent}>
          <View style={styles.sideSection}>
            {routes.slice(0, 2).map((route, i) => renderTab(route, i))}
          </View>
          <View style={styles.centerSlot}>
            {centerRoute && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPress(centerRoute)}
                style={styles.centerButton}
              >
                <Ionicons name="search" size={26} color={whiteColor} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sideSection}>
            {routes.slice(3, 5).map((route, i) => renderTab(route, i + 3))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Platform.OS === 'ios' ? 40 : 10,
    width: BAR_WIDTH,
    alignItems: 'center',
    overflow: 'visible',
  },
  barContainer: {
    width: '100%',
    height: BAR_HEIGHT,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  barSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: BAR_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  sideSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  tabItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  tabItemFocused: {
    backgroundColor: whiteColor,
  },
  tabLabel: {
    color: SIDE_ICON_FOCUSED,
    marginLeft: 6,
    fontWeight: style.fontWeightThin1x.fontWeight,
    fontSize: style.fontSizeSmall.fontSize,
  },
  centerSlot: {
    width: CENTER_BUTTON_SIZE + 12,
    height: BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    top: -(CENTER_BUTTON_SIZE / 1.6),
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: nissanPrimaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
