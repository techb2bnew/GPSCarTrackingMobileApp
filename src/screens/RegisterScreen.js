import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  //   CheckBox,
  SafeAreaView,
  ImageBackground,
  Image,
} from 'react-native';
import {IMAGE_BACKGROUND_IMAGE, MAIN_LOGO} from '../assests/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {orangeColor} from '../constants/Color';

const RegisterScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
  };

  const handleRegister = () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
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
    
    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return;
    }
    
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    
    // If all validations pass, navigate to main screens
    navigation.navigate('mainscreens');
  };

  return (
    <ImageBackground
      style={styles.container}
      // source={IMAGE_BACKGROUND_IMAGE}
      resizeMode="cover">
      <View style={{}}>
        <View
          style={{
            flexDirection: 'row',
            // gap: 20,
            alignItems: 'center',
            marginTop: 20,
          }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{}}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          {/* <Text style={styles.title}>Create Account</Text> */}
        </View>
        {/* <Text style={styles.subtitle}>Welcome back to the app</Text> */}
        <Image
          source={MAIN_LOGO}
          style={{
            height: 120,
            width: 140,
            resizeMode: 'contain',
            alignSelf: 'center',
            marginVertical: 40,
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
        />
        {emailError ? (
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        ) : null}

        <View style={styles.passwordRow}>
          <Text style={styles.label}>Password</Text>
          {/* <TouchableOpacity>
          <Text style={styles.forgot}>Forget Password?</Text>
        </TouchableOpacity> */}
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
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={[styles.input, confirmPasswordError ? styles.inputError : null]}
          placeholder="**********"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (confirmPasswordError) clearErrors();
          }}
        />
        {confirmPasswordError ? (
          <Text style={styles.fieldErrorText}>{confirmPasswordError}</Text>
        ) : null}


        {generalError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{generalError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleRegister}>
          <Text style={styles.loginButtonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupContainer}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signupText}>
            Do you have an account?{' '}
            <Text style={styles.signupLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    // marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 30,
    marginTop: 10,
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
    color: '#888',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
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
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    color: '#888',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#FF5C5C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  signupContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#000',
  },
  signupLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
