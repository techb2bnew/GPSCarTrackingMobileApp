import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import bcrypt from 'bcryptjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient'; // adjust path to your Supabase client
import { MAIN_LOGO } from '../assests/images';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';
import { spacings, style } from '../constants/Fonts';
import { getAndSaveFCMToken } from '../utils/fcmTokenManager';
import {
  nissanPrimaryBlue,
  whiteColor,
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
  blackColor,
} from '../constants/Color';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
  };

  const handleEmailContact = () => {
    const email = 'support@example.com'; // Replace with your support email
    const subject = 'Customer Support Request';
    const body = 'Hello, I need help with...';

    const emailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(emailUrl).catch(err => {
      Alert.alert('Error', 'Could not open email client');
    });
  };

  const handlePhoneContact = () => {
    const phoneNumber = '+1234567890'; // Replace with your support phone number

    const phoneUrl = `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(err => {
      Alert.alert('Error', 'Could not open phone dialer');
    });
  };

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validate email
    if (!email) {
      setEmailError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Fetch user from Supabase 'staff' table
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        setGeneralError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, data.password);

      if (!isMatch) {
        setGeneralError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Check if user is active
      if (data.status !== 'Active') {
        setGeneralError('Your account is inactive. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Login successful - save user data
      console.log('Login successful:', data);
      dispatch(setUser(data));
      await AsyncStorage.setItem('user', JSON.stringify(data));

      // Save FCM token to database after successful login
      try {
        console.log('📱 [LOGIN] Saving FCM token for user:', data.id);
        await getAndSaveFCMToken(data.id.toString());
      } catch (fcmError) {
        console.error('⚠️ [LOGIN] Error saving FCM token (non-blocking):', fcmError);
        // Don't block login if FCM token save fails
      }

      setLoading(false);

      // Navigate to main screens
      navigation.navigate('mainscreens');
    } catch (err) {
      console.error('Login error:', err);
      setGeneralError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[
        gradientSoftTop,
        gradientSoftMid1,
        gradientSoftMid2,
        gradientSoftMid3,
        gradientSoftMid4,
        gradientSoftBottom,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        <Image
          source={MAIN_LOGO}
          style={{
            height: 120,
            width: 140,
            resizeMode: 'contain',
            alignSelf: 'center',
            marginBottom: 40,
          }}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="hello@example.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) clearErrors();
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        {emailError ? (
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        ) : null}

        <View style={styles.passwordRow}>
          <Text style={styles.label}>Password</Text>
        </View>
        <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
          <TextInput
            style={[styles.passwordInput]}
            placeholder="**********"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) clearErrors();
            }}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Icon
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {passwordError ? (
          <Text style={styles.fieldErrorText}>{passwordError}</Text>
        ) : null}

        {generalError ? (
          <Text style={styles.errorText}>{generalError}</Text>
        ) : null}

        <TouchableOpacity
          style={{ alignSelf: 'flex-end' }}
          onPress={() => navigation.navigate('ForgetPasswordFlow')}>
          <Text style={styles.forgot}>Forget Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator color={whiteColor} />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.signupContainer}
          onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <Text style={styles.signupLink}>Sign up</Text>
          </Text>
        </TouchableOpacity> */}

        {/* Customer Support Button */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setSupportModalVisible(true)}
        >
          <Text style={styles.supportButtonText}>Customer Support</Text>
        </TouchableOpacity>
      </View>

      {/* Support Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={supportModalVisible}
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Support</Text>
            <Text style={styles.modalSubtitle}>Choose how you'd like to contact us</Text>

            <TouchableOpacity
              style={styles.contactOption}
              onPress={() => {
                setSupportModalVisible(false);
                handleEmailContact();
              }}
            >
              <Text style={styles.contactOptionText}>📧 Email Support</Text>
              <Text style={styles.contactOptionSubtext}>support@example.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactOption}
              onPress={() => {
                setSupportModalVisible(false);
                handlePhoneContact();
              }}
            >
              <Text style={styles.contactOptionText}>📞 Phone Support</Text>
              <Text style={styles.contactOptionSubtext}>+1 (234) 567-8900</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSupportModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingVertical: spacings.xxLarge,
    paddingHorizontal: spacings.large,
    marginTop: spacings.ExtraLarge2x,
  },
  label: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: '600',
    marginBottom: spacings.small,
    marginTop: spacings.normal,
    color: '#212121',
  },
  input: {
    height: 45,
    borderColor: 'rgba(33, 33, 33, 0.2)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: spacings.small2x,
    marginBottom: spacings.normal,
    backgroundColor: '#FFFFFF',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(33, 33, 33, 0.2)',
    borderWidth: 1.5,
    borderRadius: 8,
    marginBottom: spacings.normal,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    height: 45,
    paddingHorizontal: spacings.small2x,
    borderWidth: 0,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: spacings.small2x,
    paddingVertical: spacings.normal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgot: {
    fontSize: style.fontSizeSmall2x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#212121',
  },
  loginButton: {
    backgroundColor: blackColor,
    borderRadius: 8,
    paddingVertical: spacings.xLarge,
    alignItems: 'center',
    marginVertical: spacings.ExtraLarge2x,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loginButtonText: {
    color: whiteColor,
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: style.fontSizeNormal.fontSize,
  },
  signupContainer: {
    alignItems: 'center',
    marginTop: spacings.large,
  },
  signupText: {
    color: '#333',
  },
  signupLink: {
    fontWeight: style.fontWeightBold.fontWeight,
    color: blackColor,
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
  fieldErrorText: {
    color: '#f44336',
    fontSize: style.fontSizeSmall.fontSize,
    marginTop: spacings.xsmall,
    marginBottom: spacings.normal,
    marginLeft: spacings.xsmall,
  },
  supportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: spacings.xLarge,
    alignItems: 'center',
    marginTop: spacings.large,
    borderWidth: 1.5,
    borderColor: 'rgba(33, 33, 33, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  supportButtonText: {
    color: '#212121',
    fontWeight: style.fontWeightMedium.fontWeight,
    fontSize: style.fontSizeSmall1x.fontSize,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  contactOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  contactOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactOptionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
