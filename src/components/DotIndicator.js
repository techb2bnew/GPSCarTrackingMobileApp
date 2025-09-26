import React from 'react';
import {View, StyleSheet} from 'react-native';

const DotIndicator = ({totalSteps, currentStep}) => {
  return (
    <View style={styles.container}>
      {Array(totalSteps)
        .fill(0)
        .map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                opacity: currentStep === index ? 1 : 0.3,
                backgroundColor: currentStep === index ? '#613EEA' : '#888',
              },
            ]}
          />
        ))}
    </View>
  );
};

export default DotIndicator;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});
