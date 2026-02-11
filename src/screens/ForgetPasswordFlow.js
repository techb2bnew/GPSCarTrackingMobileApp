import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import OTPTextInput from 'react-native-otp-textinput';
import { useNavigation } from '@react-navigation/native';
import { FORGOT_1, FORGOT_2 } from '../assests/images';
import Icon from 'react-native-vector-icons/Ionicons';
import AnimatedLottieView from 'lottie-react-native';
import { heightPercentageToDP, widthPercentageToDP } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { FORGOT_PASSWORD_API_BASE } from '../constants/Constants';

const ForgetPasswordFlow = () => {
  const navigation = useNavigation();
  const otpInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const clearErrors = () => {
    setEmailError('');
    setOtpError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
  };

  const handleGoToLogin = () => {
    setShowModal(false);
    navigation.navigate('Login');
  };

  const sendOtp = async () => {
    try {
      const res = await fetch(`${FORGOT_PASSWORD_API_BASE}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const text = await res.text();
      let data = {};
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          return { success: false, message: 'Invalid response from server' };
        }
      }
      if (data.success) {
        return { success: true };
      }
      return { success: false, message: data.response || 'Failed to send OTP' };
    } catch (err) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleContinue = async () => {
    clearErrors();
    if (!email) {
      setEmailError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    const result = await sendOtp();
    setLoading(false);
    if (result.success) {
      setStep(2);
    } else {
      setGeneralError(result.message || 'Failed to send OTP');
    }
  };

  const handleOtpSubmit = async () => {
    clearErrors();
    if (otp.length < 4) {
      setOtpError('Please enter full OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${FORGOT_PASSWORD_API_BASE}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: parseInt(otp, 10),
        }),
      });
      const text = await res.text();
      setLoading(false);
      let data = {};
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          setGeneralError('Invalid response from server');
          return;
        }
      }
      if (data.success) {
        setStep(3);
      } else {
        setOtpError(data.response || 'Invalid OTP');
      }
    } catch (err) {
      setLoading(false);
      setGeneralError(err.message || 'Network error');
    }
  };

  const handleReset = async () => {
    clearErrors();
    if (!password) {
      setPasswordError('Please enter new password');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${FORGOT_PASSWORD_API_BASE}/api/staff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const text = await res.text();
      setLoading(false);
      let data = {};
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          setGeneralError('Invalid response from server');
          return;
        }
      }
      if (data.success) {
        setShowModal(true);
      } else {
        setGeneralError(data.message || data.response || 'Failed to update password');
      }
    } catch (err) {
      console.log("reee",err);
      
      setLoading(false);
      setGeneralError(err.message || 'Network error');
    }
  };

  const handleResendOtp = async () => {
    if (resendLoading || resendCooldown > 0) return;
    clearErrors();
    setResendLoading(true);
    const result = await sendOtp();
    setResendLoading(false);
    if (result.success) {
      setOtp('');
      otpInputRef.current?.clear();
      setResendCooldown(30);
    } else {
      setGeneralError(result.message || 'Failed to resend OTP');
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      clearErrors();
      if (step === 2) {
        setOtp('');
        setResendCooldown(0);
        otpInputRef.current?.clear();
      } else if (step === 3) {
        setPassword('');
        setConfirmPassword('');
      }
      setStep(step - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <View style={{ padding: spacings.large, justifyContent: "center" }}>
              <Image source={FORGOT_1} style={styles.image} />
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.desc}>
                Enter your registered email address to receive OTP
              </Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="hello@example.com"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                style={[styles.input, emailError ? styles.inputError : null]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {emailError ? (
                <Text style={styles.fieldErrorText}>{emailError}</Text>
              ) : null}
              {generalError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={{ padding: spacings.large, justifyContent: "center" }}>

              <Image source={FORGOT_1} style={styles.image} />
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.desc}>
                Enter the OTP code we just sent you on your registered email
                address
              </Text>
              <View style={styles.otpContainer}>
                <OTPTextInput
                  ref={otpInputRef}
                  handleTextChange={code => {
                    setOtp(code);
                    if (otpError) setOtpError('');
                  }}
                  inputCount={4}
                  tintColor="#003F65"
                  offTintColor="#ccc"
                  containerStyle={styles.otpWrapper}
                  textInputStyle={styles.otpInput}
                />
              </View>
              {otpError ? (
                <Text style={styles.fieldErrorText}>{otpError}</Text>
              ) : null}

              {generalError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.button} onPress={handleOtpSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={handleResendOtp}
                disabled={resendLoading || resendCooldown > 0}>
                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't get OTP ? </Text>
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#003F65" />
                  ) : resendCooldown > 0 ? (
                    <Text style={styles.resendText}>00:{String(resendCooldown).padStart(2, '0')}</Text>
                  ) : (
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={{ padding: spacings.large, justifyContent: "center" }}>
              <Image source={FORGOT_2} style={styles.image} />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.desc}>Enter your new password</Text>

              <Text style={styles.label}>New Password</Text>
              <View style={[styles.passwordContainer, passwordError ? styles.passwordContainerError : null]}>
                <TextInput
                  placeholder="Enter new password"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
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
              {passwordError ? (
                <Text style={styles.fieldErrorText}>{passwordError}</Text>
              ) : null}

              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.passwordContainer, confirmPasswordError ? styles.passwordContainerError : null]}>
                <TextInput
                  placeholder="Confirm new password"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) setConfirmPasswordError('');
                  }}
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
              {confirmPasswordError ? (
                <Text style={styles.fieldErrorText}>{confirmPasswordError}</Text>
              ) : null}

              {generalError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.button} onPress={handleReset}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalContainer1}>
            <View style={styles.modalContent1}>
              <AnimatedLottieView
                source={require('../assets/successfully.json')}
                autoPlay
                loop={false}
                style={styles.lottieAnimation}
              />
              <Text style={styles.modalTitle}>Password Reset Successfully!</Text>
              <Text style={styles.modalDesc}>
                Your password has been changed. You can now login with your new password.
              </Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleGoToLogin}>
                <Text style={styles.modalButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.normal,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: spacings.small,
  },
  headerTitle: {
    flex: 1,
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    textAlign: 'center',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.large,
  },
  image: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: spacings.ExtraLarge2x,
    marginTop: spacings.large,
  },
  title: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    textAlign: 'center',
    color: '#000',
    marginBottom: spacings.normal,
  },
  desc: {
    textAlign: 'center',
    marginBottom: spacings.ExtraLarge2x,
    color: '#666',
    fontSize: style.fontSizeSmall1x.fontSize,
    lineHeight: 20,
  },
  emailDisplay: {
    textAlign: 'center',
    marginBottom: spacings.large,
    color: '#003F65',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  label: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    marginBottom: spacings.small,
    marginTop: spacings.normal,
    color: '#000',
  },
  input: {
    height: 45,
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacings.small2x,
    marginBottom: spacings.normal,
    backgroundColor: 'white',
    fontSize: style.fontSizeNormal.fontSize,
  },
  passwordContainer: {
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    marginBottom: spacings.normal,
    backgroundColor: 'white',
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: spacings.small2x,
    fontSize: style.fontSizeNormal.fontSize,
  },
  eyeIcon: {
    paddingHorizontal: spacings.small2x,
    paddingVertical: spacings.normal,
  },
  otpContainer: {
    alignItems: 'center',
    marginVertical: spacings.large,
  },
  otpWrapper: {
    marginBottom: spacings.large,
  },
  otpInput: {
    borderWidth: 2,
    borderRadius: 10,
    width: 50,
    height: 50,
  },
  button: {
    backgroundColor: '#003F65',
    paddingVertical: spacings.xLarge,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: heightPercentageToDP(4),
    marginBottom: spacings.normal,
  },
  buttonText: {
    color: '#fff',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: heightPercentageToDP(3),
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: '#333',
    fontSize: style.fontSizeSmall1x.fontSize,
  },
  resendLink: {
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#003F65',
  },
  modalContainer1: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent1: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: spacings.ExtraLarge2x,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },
  lottieAnimation: {
    width: 140,
    height: 160,
    marginBottom: spacings.large,
  },
  modalTitle: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#000',
    textAlign: 'center',
    marginBottom: spacings.normal,
    paddingHorizontal: spacings.small,
  },
  modalDesc: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    textAlign: 'center',
    marginBottom: spacings.xLarge,
    lineHeight: 22,
    paddingHorizontal: spacings.small,
  },
  modalButton: {
    backgroundColor: '#003F65',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.ExtraLarge2x,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: spacings.large,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: spacings.small2x,
    borderRadius: 8,
    marginBottom: spacings.large,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  passwordContainerError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: style.fontSizeSmall.fontSize,
    marginTop: spacings.xsmall,
    marginBottom: spacings.normal,
    marginLeft: spacings.xsmall,
  },
});

export default ForgetPasswordFlow;
