import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import bcrypt from 'bcryptjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient'; // adjust path to your Supabase client
import { MAIN_LOGO } from '../assests/images';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';

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
      const {data, error} = await supabase
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
    <ImageBackground style={styles.container} resizeMode="cover">
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, passwordError ? styles.inputError : null]}
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

        {/* <TouchableOpacity
          style={{ alignSelf: 'flex-end' }}
          onPress={() => navigation.navigate('ForgetPasswordFlow')}>
          <Text style={styles.forgot}>Forget Password?</Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator color="#fff" />
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
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 45,
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    height: 45,
    paddingHorizontal: 12,
    borderWidth: 0,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgot: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#613EEA',
  },
  loginButton: {
    backgroundColor: '#613EEA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 40,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  signupContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#333',
  },
  signupLink: {
    fontWeight: 'bold',
    color: '#613EEA',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 4,
  },
  supportButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  supportButtonText: {
    color: '#613EEA',
    fontWeight: '600',
    fontSize: 14,
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
