import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {widthPercentageToDP} from '../utils';
import AnimatedLottieView from 'lottie-react-native';
import BleTesting from '../components/BleTesting';

export default function ScanScreen({navigation}) {
  const [showModal, setShowModal] = useState(false);

  const handleOpen = () => {
    setShowModal(true);

    setTimeout(() => {
      navigation.navigate('ValidIDScreen');
      setShowModal(false);
    }, 2000);
  };
  return (
    <View style={styles.container}>

      {/* <BleTesting/> */}
       <Text style={styles.title}>Scan Options</Text> 

      <TouchableOpacity
        style={styles.button}
        onPress={handleOpen}
        // onPress={()=>navigation.navigate('ScannerScreen')}
      >
        <Ionicons
          name="car-sport"
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.buttonText}>Scan VIN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <Ionicons name="barcode" size={24} color="white" style={styles.icon} />
        <Text style={styles.buttonText}>Scan Tracker Chip</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <>
              <AnimatedLottieView
                source={require('../assets/scan.json')}
                autoPlay
                loop
                style={{width: 180, height: 300}}
              />
            </>
          </View>
        </View>
      </Modal> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#613EEA',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,

    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: 'bold',
  },
  icon: {},
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },
});
