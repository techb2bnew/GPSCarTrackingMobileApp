import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
} from 'react-native';
// import MaterialDesignIcons from 'react-native-vector-icons/MaterialDesignIcons';
import Feather from 'react-native-vector-icons/Feather';
import {NOTIFICATION, TICK} from '../assests/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {widthPercentageToDP} from '../utils';
import AnimatedLottieView from 'lottie-react-native';

const ValidIDScreen = ({navigation}) => {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}>
          <Image
            source={NOTIFICATION} // replace with your image
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Image
          source={TICK} // replace with your local green check image
          style={styles.checkIcon}
        />
        <Text style={styles.validText}>Valid ID</Text>

        <View style={styles.infoContainer}>
          <View
            style={{
              flexDirection: 'row',
              width: widthPercentageToDP(80),
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <Text style={styles.label}>VIN ID :</Text>
            <Text style={styles.boldText}>9405747394574750</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              width: widthPercentageToDP(80),
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <Text style={styles.label}>Chip ID:</Text>
            <Text style={styles.boldText}>CPA-0129</Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              width: widthPercentageToDP(80),
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text style={styles.label}>Facility ID:</Text>
            <Text style={styles.boldText}>P-97</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated Date :</Text>
            <Text style={styles.detailValue}>02/07/2025</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated Time :</Text>
            <Text style={styles.detailValue}>05:00 Pm</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added By :</Text>
            <Text style={styles.detailValue}>Mark Evans</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleOpen}>
            <Ionicons name="scan" size={18} color="#fff" />
            <Text style={styles.buttonText}>Re-Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={()=> navigation.navigate("EditConnection")}>
            <Feather name="edit" size={18} color="#fff" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
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
      </View>
    </View>
  );
};

export default ValidIDScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', padding: 20},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
  },
  profileImage: {width: 40, height: 40, borderRadius: 20},
  body: {flex: 1, alignItems: 'center', marginTop: 100},
  checkIcon: {width: 80, height: 80, marginBottom: 10},
  validText: {fontSize: 20, fontWeight: '600', marginBottom: 20},
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: widthPercentageToDP(90),
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    paddingBottom: 30,
    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  label: {fontSize: 16, color: '#333', flexDirection: 'row'},
  boldText: {fontWeight: 'bold'},
  detailsTitle: {fontSize: 18, fontWeight: '600', marginBottom: 10},
  detailsContainer: {
    width: widthPercentageToDP(90),
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    paddingBottom: 30,
    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  detailLabel: {fontSize: 14, color: '#555'},
  detailValue: {fontSize: 14, fontWeight: 'bold'},
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: widthPercentageToDP(40),
    backgroundColor: '#6c45f2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  buttonText: {color: '#fff', fontSize: 16, fontWeight: 600},
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
