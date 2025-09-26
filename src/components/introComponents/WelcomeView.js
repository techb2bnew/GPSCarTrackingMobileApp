import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {INTRO_1, MAIN_LOGO, SPLASH_IMAGE} from '../../assests/images';
import {heightPercentageToDP} from '../../utils';

const {width, height} = Dimensions.get('window');

const WelcomeView = ({animationController, onStartClick}) => {
  return (
    <ImageBackground
      style={styles.container}
      source={SPLASH_IMAGE}
      resizeMode="cover">
      <View>
        {/* <Image
          source={MAIN_LOGO} // replace with your image
          style={styles.image}
          resizeMode="contain"
        /> */}

        {/* <Text style={styles.title}>Best Parking Spots</Text>
        <Text style={styles.subtitle}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </Text> */}

        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: '#613eea',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 50,
            alignSelf: 'center',
            marginTop: heightPercentageToDP(60),
          }}
          onPress={onStartClick}>
          <Text style={{color: '#fff', fontWeight: 600}}> Let's begin </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 30,
  },
  image: {
    width: width * 0.7,
    height: height * 0.4,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#130057',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default WelcomeView;
