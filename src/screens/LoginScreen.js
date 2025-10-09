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
} from 'react-native';
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

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
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
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="**********"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) clearErrors();
          }}
        />
        {passwordError ? (
          <Text style={styles.fieldErrorText}>{passwordError}</Text>
        ) : null}

        {generalError ? (
          // <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{generalError}</Text>
          // </View>
        ) : null}

        <TouchableOpacity
          style={{ alignSelf: 'flex-end' }}
          onPress={() => navigation.navigate('ForgetPasswordFlow')}>
          <Text style={styles.forgot}>Forget Password?</Text>
        </TouchableOpacity>

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
      </View>
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
});
