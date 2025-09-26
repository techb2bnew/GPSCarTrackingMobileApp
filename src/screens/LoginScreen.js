// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   //   CheckBox,
//   SafeAreaView,
//   ImageBackground,
//   Image,
// } from 'react-native';
// import {IMAGE_BACKGROUND_IMAGE, MAIN_LOGO} from '../assests/images';
// import {orangeColor} from '../constants/Color';

// const LoginScreen = ({navigation}) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [keepSignedIn, setKeepSignedIn] = useState(false);

//   return (
//     <ImageBackground
//       style={styles.container}
//       // source={IMAGE_BACKGROUND_IMAGE}
//       resizeMode="cover">
//       <View style={styles.container}>
//         <Text style={styles.title}></Text>
//         {/* <Text style={styles.subtitle}></Text> */}
//         <Image
//           source={MAIN_LOGO}
//           style={{
//             height: 120,
//             width: 140,
//             resizeMode: 'contain',
//             alignSelf: 'center',
//             marginBottom: 40,
//           }}
//         />
//         <Text style={styles.label}>Email</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="hello@example.com"
//           placeholderTextColor="#aaa"
//           value={email}
//           onChangeText={setEmail}
//         />

//         <View style={styles.passwordRow}>
//           <Text style={styles.label}>Password</Text>
//         </View>
//         <TextInput
//           style={styles.input}
//           placeholder="**********"
//           placeholderTextColor="#aaa"
//           secureTextEntry
//           value={password}
//           onChangeText={setPassword}
//         />
//         <TouchableOpacity
//           style={{alignSelf: 'flex-end'}}
//           onPress={() => navigation.navigate('ForgetPasswordFlow')}>
//           <Text style={styles.forgot}>Forget Password?</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.loginButton}
//           onPress={() => navigation.navigate('mainscreens')}>
//           <Text style={styles.loginButtonText}>Login</Text>
//         </TouchableOpacity>

//         {/* <View style={styles.orContainer}>
//           <View style={styles.line} />
//           <Text style={styles.orText}>or sign in with</Text>
//           <View style={styles.line} />
//         </View>

//         <TouchableOpacity style={styles.googleButton}>
//           <Text style={styles.googleButtonText}>Continue with Google</Text>
//         </TouchableOpacity> */}

//         <TouchableOpacity
//           style={styles.signupContainer}
//           onPress={() => navigation.navigate('Register')}>
//           <Text style={styles.signupText}>
//             Don't have an account?{' '}
//             <Text style={styles.signupLink}>Sign up</Text>
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </ImageBackground>
//   );
// };

// export default LoginScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingVertical: 20,
//     paddingHorizontal: 16,
//     marginTop: 30,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     marginTop: 20,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#444',
//     marginBottom: 30,
//     marginTop: 10,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 6,
//     marginTop: 10,
//   },
//   input: {
//     height: 45,
//     borderColor: '#aaa',
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     marginBottom: 10,
//   },
//   passwordRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   forgot: {
//     fontSize: 13,
//      fontWeight: 'bold',
//     color: '#613EEA',
//   },
//   checkboxContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 15,
//   },
//   checkboxLabel: {
//     marginLeft: 8,
//     fontSize: 14,
//   },
//   loginButton: {
//     backgroundColor: '#613EEA',
//     borderRadius: 8,
//     paddingVertical: 14,
//     alignItems: 'center',
//     marginVertical: 40,
//   },
//   loginButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   orContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 30,
//   },
//   line: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#ccc',
//   },
//   orText: {
//     marginHorizontal: 10,
//     color: '#888',
//   },
//   googleButton: {
//     borderWidth: 1,
//     borderColor: '#613EEA',
//     borderRadius: 8,
//     paddingVertical: 14,
//     alignItems: 'center',
//   },
//   googleButtonText: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     color: '#000',
//   },
//   signupContainer: {
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   signupText: {
//     color: '#333',
//   },
//   signupLink: {
//     fontWeight: 'bold',
//     color: '#613EEA',
//     // textDecorationLine: 'underline',
//   },
// });

import React, {useState} from 'react';
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
import {supabase} from '../lib/supabaseClient'; // adjust path to your Supabase client
import {MAIN_LOGO} from '../assests/images';
import {useDispatch} from 'react-redux';
import {setUser} from '../redux/userSlice';

const LoginScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('test@yopmail.com');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    setLoading(true);
     dispatch(setUser(email));
      await AsyncStorage.setItem('user', JSON.stringify(email));
      setLoading(false);
      // login successful
      navigation.navigate('mainscreens');
    // try {
    //   // const {data, error} = await supabase
    //   //   .from('staff')
    //   //   .select('*')
    //   //   .eq('email', email)
    //   //   .single();

    //   // if (error || !data) {
    //   //   alert('Invalid email or password');
    //   //   setLoading(false);
    //   //   return;
    //   // }

    //   // const isMatch = await bcrypt.compare(password, data.password);

    //   // if (!isMatch) {
    //   //   alert('Invalid email or password');
    //   //   setLoading(false);
    //   //   return;
    //   // }

    //   // if (data.status !== 'Active') {
    //   //   alert('User inactive');
    //   //   setLoading(false);
    //   //   return;
    //   // }
    //   // console.log('data::::', data);
    //   dispatch(setUser(email));
    //   await AsyncStorage.setItem('user', JSON.stringify(email));
    //   setLoading(false);
    //   // login successful
    //   navigation.navigate('mainscreens');
    // } catch (err) {
    //   console.error('Login error:', err);
    //   alert('Something went wrong. Please try again.');
    //   setLoading(false);
    // }
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
          style={styles.input}
          placeholder="hello@example.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordRow}>
          <Text style={styles.label}>Password</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="**********"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={{alignSelf: 'flex-end'}}
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

        <TouchableOpacity
          style={styles.signupContainer}
          onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <Text style={styles.signupLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
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
});
