import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import OTPTextInput from 'react-native-otp-textinput';
import {useNavigation} from '@react-navigation/native';
import {FORGOT_1, FORGOT_2} from '../assests/images';
import Icon from 'react-native-vector-icons/Ionicons';
import AnimatedLottieView from 'lottie-react-native';
import {widthPercentageToDP} from '../utils';

const ForgetPasswordFlow = () => {
  const navigation = useNavigation();
  const otpInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
    const handleOpen = () => {
      setShowModal(true);
  
      setTimeout(() => {
        navigation.navigate('Login');
        setShowModal(false);
      }, 2000);
    };

  const handleContinue = () => {
    if (!emailOrPhone) {
      alert('Please enter email or phone');
      return;
    }
    setStep(2);
  };

  const handleOtpSubmit = () => {
    if (otp.length < 4) {
      alert('Please enter full OTP');
      return;
    }
    setStep(3);
  };

  const handleReset = () => {
    if (!password || !confirmPassword) {
      alert('Please fill both fields');
      return;
    }
     setShowModal(true);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Login');
      setShowModal(false);
    }, 2000);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Icon */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      {step === 1 && (
        <>
          <Image source={FORGOT_1} style={styles.image} />
          <Text style={styles.title}>Forget Password</Text>
          <Text style={styles.desc}>Enter your email ID or mobile number</Text>
          <TextInput
            placeholder="Email ID/ Mobile Number"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <Image source={FORGOT_1} style={styles.image} />
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.desc}>
            Enter the OTP code we just sent you on your registered Email/Phone
            number
          </Text>
          <OTPTextInput
            ref={otpInputRef}
            handleTextChange={code => setOtp(code)}
            inputCount={5}
            tintColor="#613EEA"
            offTintColor="#ccc"
            containerStyle={{marginBottom: 20}}
            textInputStyle={{borderWidth: 2, borderRadius: 10}}
          />
          <TouchableOpacity style={styles.button} onPress={handleOtpSubmit}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupContainer}
            onPress={() => console.log("getotp")}>
            <Text style={styles.signupText}>
             Didn’t get OTP?{' '}
              <Text style={styles.signupLink}>Resend OTP</Text>
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step === 3 && (
        <>
          <Image source={FORGOT_2} style={styles.image} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.desc}>Enter your new password</Text>
          {/* <TextInput
            placeholder="New Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
          /> */}

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="New Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.inputPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}>
              <Icon
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.inputPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}>
              <Icon
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleReset}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity>

           <Modal visible={showModal} transparent animationType="fade">
                  <View style={styles.modalContainer1}>
                    <View style={styles.modalContent1}>
                      {/* {isLoggingOut ? ( */}
                      <>
                        <AnimatedLottieView
                          source={require('../assets/successfully.json')}
                          autoPlay
                          loop
                          style={{width: 180, height: 300}}
                        />
                      </>
                      {/* )} */}
                    </View>
                  </View>
                </Modal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  backButton: {position: 'absolute', top: 60, left: 20, zIndex: 1},
  image: {width: 100, height: 100, alignSelf: 'center', marginBottom: 20},
  title: {fontSize: 22, fontWeight: 'bold', textAlign: 'center'},
  desc: {textAlign: 'center', marginVertical: 20, color: '#666'},
 signupContainer: {
    alignItems: "flex-start",
    marginTop: 20,
  },
  signupText: {
    color: '#333',
  },
  signupLink: {
    fontWeight: 'bold',
    color: '#613EEA',
    // textDecorationLine: 'underline',
  },
  input: {
    height: 45,
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  passwordContainer: {
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
  },
  inputPassword: {flex: 1, padding: 10},
  eyeIcon: {paddingHorizontal: 10},
  button: {
    backgroundColor: '#613EEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontSize: 16, fontWeight: 600},
   modalContainer1: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent1: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },
});

export default ForgetPasswordFlow;
