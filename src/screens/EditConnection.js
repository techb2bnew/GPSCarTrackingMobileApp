import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {NOTIFICATION} from '../assests/images';
import AnimatedLottieView from 'lottie-react-native';
import {widthPercentageToDP} from '../utils';

const EditConnection = ({navigation}) => {
  const [vinNumber, setVinNumber] = useState('');
  const [chipNumber, setChipNumber] = useState('');
  const [parkingModalVisible, setParkingModalVisible] = useState(false);
  const [selectedParking, setSelectedParking] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);


  const handleOpen = () => {
    setShowModal(true);

    setTimeout(() => {
      // navigation.navigate('ValidIDScreen');
      setShowModal(false);
    }, 2000);
  };

  const handleSubmit = () => {
    setShowSuccessModal(true);

    setTimeout(() => {
      navigation.navigate('ValidIDScreen');
      setShowSuccessModal(false);
    }, 2000);
  };

  const parkingOptions = ['p-12', 'p-34', 'p-97'];

  const handleSelectParking = parking => {
    setSelectedParking(parking);
    setParkingModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}>
          <Image
            source={NOTIFICATION} // replace with your image
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>
      {/* VIN Number Input */}
      <Text style={{marginBottom: 10, fontWeight: 500}}>Vin Id</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholder="VIN Id"
          value={vinNumber}
          onChangeText={setVinNumber}
          style={styles.input}
        />
        <TouchableOpacity style={styles.iconButton} onPress={handleOpen}>
          <Icon name="scan-outline" size={24} color="#613EEA" />
        </TouchableOpacity>
      </View>

      {/* Chip Number Input */}
      <Text style={{marginBottom: 10, fontWeight: 500}}>Chip Id</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Chip Id"
          value={chipNumber}
          onChangeText={setChipNumber}
          style={styles.input}
        />
        <TouchableOpacity style={styles.iconButton} onPress={handleOpen}>
          <Icon name="scan-outline" size={24} color="#613EEA" />
        </TouchableOpacity>
      </View>

      {/* Parking Dropdown */}
      <Text style={{marginBottom: 10, fontWeight: 500}}>Facility</Text>

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setParkingModalVisible(true)}>
        <Text style={{color: selectedParking ? '#000' : '#999'}}>
          {selectedParking || 'Select Facility '}
        </Text>
        <Icon name="chevron-down" size={20} color="#000" />
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Connected & Update</Text>
      </TouchableOpacity>

      {/* Parking Modal */}
      <Modal
        visible={parkingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setParkingModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Parking</Text>
            <FlatList
              data={parkingOptions}
              keyExtractor={item => item}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.parkingItem}
                  onPress={() => handleSelectParking(item)}>
                  <Text style={styles.parkingText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setParkingModalVisible(false)}
              style={styles.modalCloseButton}>
              <Text style={{color: '#613EEA'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* anIMATION */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer1}>
          <View style={styles.modalContent1}>
            {/* {isLoggingOut ? ( */}
            <>
              <AnimatedLottieView
                source={require('../assets/scan.json')}
                autoPlay
                loop
                style={{width: 180, height: 300}}
              />
            </>
            {/* )} */}
          </View>
        </View>
      </Modal>

      {/* Success Modal anomation */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
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
    </View>
  );
};

export default EditConnection;

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 100,
  },
  profileImage: {width: 40, height: 40, borderRadius: 20},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
  },
  input: {flex: 1, padding: 10},
  iconButton: {paddingHorizontal: 10},
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#613EEA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontSize: 16},

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 20},
  parkingItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  parkingText: {fontSize: 16},
  modalCloseButton: {
    marginTop: 20,
    alignItems: 'center',
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
    padding: 20,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },
});
