// import React, { useState, useEffect } from 'react';
// import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
// import Animated, {
//   useSharedValue,
//   withTiming,
//   useAnimatedStyle,
//   interpolate,
//   Extrapolate,
// } from 'react-native-reanimated';
// import RelaxView from '../components/introComponents/RelaxView';
// import CareView from '../components/introComponents/CareView';
// import MoodDiaryView from '../components/introComponents/MoodDiaryView';
// import DotIndicator from '../components/DotIndicator';
// import WelcomeView from '../components/introComponents/WelcomeView';

// const { height } = Dimensions.get('window');

// const IntroductionAnimationScreen = ({ navigation }) => {
//   const totalSteps = 3;
//   const [currentStep, setCurrentStep] = useState(0);

//   const progress = useSharedValue(0); // like animationController

//   const onNextClick = () => {
//     let toValue = progress.value;
//     if (progress.value === 0) {
//       toValue = 0.33;
//       setCurrentStep(1);
//     } else if (progress.value >= 0.33 && progress.value < 0.66) {
//       toValue = 0.66;
//       setCurrentStep(2);
//     } else if (progress.value >= 0.66) {
//       navigation.navigate("Login");
//       return;
//     }
//     progress.value = withTiming(toValue, { duration: 600 });
//   };

//   const onSkipClick = () => {
//     progress.value = withTiming(0.66, { duration: 800 });
//     setCurrentStep(2);
//     navigation.navigate("Login");
//   };

//   const firstStyle = useAnimatedStyle(() => ({
//     transform: [
//       {
//         translateY: interpolate(
//           progress.value,
//           [0, 0.33, 0.66],
//           [0, -height, -height],
//           Extrapolate.CLAMP
//         ),
//       },
//     ],
//   }));

//   const secondStyle = useAnimatedStyle(() => ({
//     transform: [
//       {
//         translateY: interpolate(
//           progress.value,
//           [0, 0.33, 0.66],
//           [height, 0, -height],
//           Extrapolate.CLAMP
//         ),
//       },
//     ],
//   }));

//   const thirdStyle = useAnimatedStyle(() => ({
//     transform: [
//       {
//         translateY: interpolate(
//           progress.value,
//           [0, 0.33, 0.66],
//           [height, height, 0],
//           Extrapolate.CLAMP
//         ),
//       },
//     ],
//   }));

//   return (
//     <View style={styles.container}>
//        <Animated.View style={[styles.slide, firstStyle]}>
//         <WelcomeView />
//       </Animated.View>
//       <Animated.View style={[styles.slide, firstStyle]}>
//         <RelaxView />
//       </Animated.View>

//       <Animated.View style={[styles.slide, secondStyle]}>
//         <CareView />
//       </Animated.View>

//       <Animated.View style={[styles.slide, thirdStyle]}>
//         <MoodDiaryView />
//       </Animated.View>

//       <View style={{ width: "100%", position: "absolute", bottom: 50 }}>
//         <DotIndicator totalSteps={totalSteps} currentStep={currentStep} />
//       </View>

//       <View style={styles.buttonContainer}>
//         <TouchableOpacity onPress={onSkipClick}>
//           <Text style={styles.skip}>SKIP</Text>
//         </TouchableOpacity>
//         <TouchableOpacity onPress={onNextClick} style={styles.nextButton}>
//           <Text style={styles.next}>NEXT</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// export default IntroductionAnimationScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   slide: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   buttonContainer: {
//     position: 'absolute',
//     bottom: 50,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     paddingHorizontal: 30,
//     alignItems: 'center',
//   },
//   skip: {
//     fontSize: 16,
//     color: '#888',
//   },
//   nextButton: {
//     backgroundColor: '#613EEA',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   next: {
//     color: '#FFF',
//     fontWeight: '600',
//   },
// });

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import WelcomeView from '../components/introComponents/WelcomeView';
import RelaxView from '../components/introComponents/RelaxView';
import CareView from '../components/introComponents/CareView';
import MoodDiaryView from '../components/introComponents/MoodDiaryView';
import DotIndicator from '../components/DotIndicator';

const { height } = Dimensions.get('window');

const IntroductionAnimationScreen = ({ navigation }) => {
  const totalSteps = 3;
  const [currentStep, setCurrentStep] = useState(0); // 0=Welcome, 1=Relax, 2=Care, 3=MoodDiary
  const [showWelcome, setShowWelcome] = useState(true);

  const progress = useSharedValue(0);

  const onStartClick = () => {
    setShowWelcome(false);
    setCurrentStep(1);
    progress.value = withTiming(0, { duration: 600 });
  };

  const onNextClick = () => {
    if (currentStep === 1) {
      progress.value = withTiming(0.33, { duration: 600 });
      setCurrentStep(2);
    } else if (currentStep === 2) {
      progress.value = withTiming(0.66, { duration: 600 });
      setCurrentStep(3);
    } else if (currentStep === 3) {
      navigation.navigate("Login");
    }
  };

  const onSkipClick = () => {
    progress.value = withTiming(0.66, { duration: 800 });
    setCurrentStep(3);
    navigation.navigate("Login");
  };

  const relaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 0.33],
          [0, -height],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const careStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 0.33, 0.66],
          [height, 0, -height],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const moodDiaryStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.33, 0.66],
          [height, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <View style={styles.container}>
      {showWelcome ? (
        <WelcomeView onStartClick={onStartClick} />
      ) : (
        <>
          <Animated.View style={[styles.slide, relaxStyle]}>
            <RelaxView animationController={progress} />
          </Animated.View>

          <Animated.View style={[styles.slide, careStyle]}>
            <CareView triggerAnimation={currentStep === 2} />
          </Animated.View>

          <Animated.View style={[styles.slide, moodDiaryStyle]}>
            <MoodDiaryView progress={progress} triggerAnimation={currentStep === 3} />
          </Animated.View>

          <View style={{ width: "100%", position: "absolute", bottom: 100 }}>
            <DotIndicator totalSteps={totalSteps} currentStep={currentStep - 1} />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onSkipClick}>
              <Text style={styles.skip}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onNextClick} style={styles.nextButton}>
              <Text style={styles.next}>NEXT</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default IntroductionAnimationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  skip: {
    fontSize: 16,
    color: '#888',
  },
  nextButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  next: {
    color: '#FFF',
    fontWeight: '600',
  },
});
