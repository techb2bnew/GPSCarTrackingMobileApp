import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-simple-toast';
import {
  ACTIVE,
  BATTERY,
  INACTIVE,
  MAP_ICON,
  MAP_IMAGE,
  NOTIFICATION,
  VEHICLE_REG,
} from '../assests/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DrawerMenu from '../components/DrawerMenu';
import ParkingMap from '../components/ParkingMap';
import {parkingYards} from '../constants/Constants';
import {
  heightPercentageToDP,
  heightPercentageToDP as hp,
  widthPercentageToDP,
  widthPercentageToDP as wp,
} from '../utils';
import {useFocusEffect} from '@react-navigation/native';
import ParkingYardScreen from './ParkingYardScreen';
import { redColor } from '../constants/Color';

const cardData = [
  // {
  //   id: 1,
  //   icon: VEHICLE_REG,
  //   text: 'Vehicles Registered',
  //   showRedDot: true,
  //   backgroundColor: '#613EEA',
  //   count: 40,
  // },
  {
    id: 1,
    icon: ACTIVE,
    text: 'Active Chips',
    backgroundColor: '#F2893D',
    count: 30,
    type: 'active',
  },
  {
    id: 2,
    icon: INACTIVE,
    text: 'In-Active Chips',
    backgroundColor: '#F24369',
    count: 10,
    type: 'inactive',
  },
  {
    id: 3,
    icon: BATTERY,
    text: 'Low Battery Chips',
    backgroundColor: '#45C64F',
    count: 5,
    type: 'lowBattery',
  },
];
export default function HomeScreen({navigation, setCheckUser}) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedYard, setSelectedYard] = useState(null);
  
  // Dynamic yards state
  const [yards, setYards] = useState([]);
  const [showAddYardModal, setShowAddYardModal] = useState(false);
  const [yardName, setYardName] = useState('');
  const [yardSlots, setYardSlots] = useState('');
  const [yardAddress, setYardAddress] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState({
    yardName: '',
    yardSlots: '',
    yardAddress: '',
  });

  // Load yards from AsyncStorage
  useEffect(() => {
    loadYards();
  }, []);

  const loadYards = async () => {
    try {
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        setYards(JSON.parse(savedYards));
      }
    } catch (error) {
      console.error('Error loading yards:', error);
    }
  };

  // Save yards to AsyncStorage
  const saveYards = async (newYards) => {
    try {
      await AsyncStorage.setItem('parking_yards', JSON.stringify(newYards));
    } catch (error) {
      console.error('Error saving yards:', error);
    }
  };

  // Clear specific error
  const clearError = (field) => {
    setErrors(prev => ({...prev, [field]: ''}));
  };

  // Clear form data
  const clearFormData = () => {
    setYardName('');
    setYardSlots('');
    setYardAddress('');
    setErrors({yardName: '', yardSlots: '', yardAddress: ''});
  };

  // Validate form
  const validateForm = () => {
    let newErrors = {
      yardName: '',
      yardSlots: '',
      yardAddress: '',
    };
    let isValid = true;

    if (!yardName.trim()) {
      newErrors.yardName = 'Please enter yard name';
      isValid = false;
    }

    if (!yardSlots.trim()) {
      newErrors.yardSlots = 'Please enter number of slots';
      isValid = false;
    } else if (isNaN(yardSlots) || parseInt(yardSlots) <= 0) {
      newErrors.yardSlots = 'Please enter valid number of slots';
      isValid = false;
    }

    if (!yardAddress.trim()) {
      newErrors.yardAddress = 'Please enter yard address';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Add new yard
  const handleAddYard = async () => {
    if (!validateForm()) {
      return;
    }

    // Generate unique ID
    const newId = Date.now().toString();
    
    const newYard = {
      id: newId,
      name: yardName,
      address: yardAddress,
      slots: parseInt(yardSlots),
      createdAt: new Date().toISOString(),
    };

    const updatedYards = [...yards, newYard];
    setYards(updatedYards);
    await saveYards(updatedYards);

    // Reset form and close modal
    clearFormData();
    setShowAddYardModal(false);

    Toast.show('✅ Yard added successfully!', Toast.LONG);
  };

  const renderItem = ({item}) => {
    const isSelected = item?.id === selectedYard;

    return (
      <TouchableOpacity
        style={[styles.card1, isSelected && styles.selectedCard]}
        onPress={() => {
          setSelectedYard(item?.id),
            navigation.navigate('YardDetailScreen', {
              yardId: item?.id,
              yardName: item?.name,
              fromScreen: 'HomeScreen'
            });
        }}>
        <Text style={[styles.name1, isSelected && styles.selectedText]}>
          {item?.name}
        </Text>
        <Text style={[styles.address, isSelected && styles.selectedText]}>
          {item?.address}
        </Text>
      </TouchableOpacity>
    );
  };
  const handlePress = item => {
    setDrawerOpen(true);

    // Hide tab bar when modal opens
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'none'}});
  };

  const closeModal = () => {
    setDrawerOpen(false);

    // Show tab bar again
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
  };
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
    }, []),
  );

  const handleOpenAR = () => {
    // Send static coordinates instead of yard center
    // Static location 500m away in Mohali
    const target = {latitude:30.713452,  longitude: 76.691131};
    navigation.navigate('ARNavigationScreen', {target});
  };

  return (
    <View style={[styles.container, {marginBottom: 0}]}>
      <View
        style={[
          styles.header,
          {position: 'absolute', top: 30, width: '100%', zIndex: 1},
        ]}>
        <TouchableOpacity onPress={handlePress}>
          <DrawerMenu
            isOpen={isDrawerOpen}
            onClose={closeModal}
            navigation={navigation}
            setCheckUser={setCheckUser}
          />
          <Ionicons name="menu" size={30} color="black" />
        </TouchableOpacity>
        {!isDrawerOpen && (
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchScreen')}>
            <Ionicons
              name="search"
              size={22}
              color="#555"
              style={{marginRight: 8}}
            />
            <Text style={{color: '#555'}}>
              Search VIN, Make, Model, Year...
            </Text>
            {/* <TextInput
            style={styles.input}
            placeholder="Search VIN, Make, Model, Year..."
             editable={false} 
          /> */}
          </TouchableOpacity>
        )}
        {/* <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
          <Ionicons name="search" size={30} color="black" />
        </TouchableOpacity> */}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={handleOpenAR} style={{marginRight: 12}}>
            <Ionicons name="navigate" size={28} color="#613EEA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationScreen')}>
            <Image
              source={NOTIFICATION}
              style={{
                height: 36,
                width: 36,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Map and Menu */}

        {/* <TouchableOpacity
        style={{
          position: 'absolute',
          backgroundColor: '#613EEA',
          top: 100,
          right: 14,
          zIndex: 999999,
          height: 36,
          width: 36,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 100,
        }}
        onPress={() => navigation.navigate('SearchScreen')}>
        <Ionicons name="search" size={20} color="#fff" />
      </TouchableOpacity> */}

        {/* <View style={{height: hp(45)}}>
          <ParkingMap
            parkingYards={parkingYards}
            homeScreen={true}
            zoomIn={true}
            home={true}
          />
        </View>  */}
        <View style={{height: hp(10)}}></View>

        {/* Options Cards */}
        <View style={styles.cardsContainer}>
          {cardData?.map(item => (
            <TouchableOpacity
              key={item?.id}
              style={[
                styles.card,
                {marginLeft: 0, backgroundColor: item.backgroundColor},
              ]}
              onPress={() =>
                navigation.navigate('ActiveChipScreen', {type: item.type})
              }>
              <Text style={styles.cardText}>{item.text}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={[styles.cardText, {fontSize: 22}]}>
                  {item.count}
                </Text>
                <Image
                  source={item?.icon}
                  style={{
                    height: 40,
                    width: 40,
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{flex: 1, marginBottom: 100}}>
          <View style={{flex: 1, paddingTop: 20, paddingHorizontal: 16}}>
            <View style={styles.yardsHeader}>
              <Text style={styles.title}>Parking Yards</Text>
              <TouchableOpacity 
                style={styles.addYardButton}
                onPress={() => setShowAddYardModal(true)}
              >
                <Ionicons name="add-circle" size={32} color="#613EEA" />
              </TouchableOpacity>
            </View>

            {/* Dynamic Yards */}
            {yards.length > 0 ? (
              <FlatList
                data={yards}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
              />
            ) : (
              <View style={styles.emptyYardContainer}>
                <Ionicons name="business-outline" size={80} color="#ccc" />
                <Text style={styles.emptyYardText}>No Parking Yards Yet</Text>
                <Text style={styles.emptyYardSubtext}>
                  Tap the + button above to add your first parking yard
                </Text>
              </View>
            )}

            {/* Static Yards - Commented for future use */}
            {/* <FlatList
              data={parkingYards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            /> */}
          </View>
        </View>
      </ScrollView>

      {/* Add Yard Modal */}
      <Modal
        visible={showAddYardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          clearFormData();
          setShowAddYardModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add New Parking Yard</Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      clearFormData();
                      setShowAddYardModal(false);
                    }}>
                      <Ionicons name="close" size={28} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Yard Name *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardName && styles.inputError]}
                        placeholder="e.g., North Parking Yard"
                        value={yardName}
                        onChangeText={(text) => {
                          setYardName(text);
                          clearError('yardName');
                        }}
                        returnKeyType="next"
                      />
                      {errors.yardName ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardName}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Address *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardAddress && styles.inputError]}
                        placeholder="e.g., 123 Main Street, City"
                        value={yardAddress}
                        onChangeText={(text) => {
                          setYardAddress(text);
                          clearError('yardAddress');
                        }}
                        multiline
                        numberOfLines={2}
                        returnKeyType="next"
                      />
                      {errors.yardAddress ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardAddress}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Number of Parking Slots *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardSlots && styles.inputError]}
                        placeholder="e.g., 50"
                        value={yardSlots}
                        onChangeText={(text) => {
                          setYardSlots(text);
                          clearError('yardSlots');
                        }}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      {errors.yardSlots ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardSlots}</Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleAddYard();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.submitButtonText}>Add Yard</Text>
                    </TouchableOpacity>
                    
                    {/* Extra space for keyboard */}
                    <View style={{height: 20}} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: heightPercentageToDP(5),
    width: widthPercentageToDP(64),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  drawer: {
    position: 'absolute',
    right: -100,
    top: 100,
  },
  headerTitle: {fontWeight: 'bold', fontSize: 16},
  topContainer: {backgroundColor: 'white'},
  mapPlaceholder: {position: 'relative', alignItems: 'flex-end'},
  mapImage: {
    width: '80%',
    height: 160,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 20,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'purple',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
  },
  detailsContainer: {marginTop: 40},
  locationText: {fontWeight: 'bold', fontSize: 18, textAlign: 'center'},
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingLeft: 16,
  },
  profileImage: {width: 60, height: 60, borderRadius: 30},
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'green',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {fontWeight: 'bold', fontSize: 16},
  role: {color: 'gray'},
  badge: {color: 'gray'},
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '48%',
    height: 140,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginBottom: 20,
    elevation: 4,
    // Bottom shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardText: {marginTop: 8, fontWeight: 600, fontSize: 15, color: '#fff'},
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    position: 'absolute',
    top: 10,
    right: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  card1: {
    width: '100%', // full width
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12, // spacing between rows
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  name1: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#252837',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#252837',
  },
  selectedText: {
    color: '#613EEA',
  },
  // Yards Header
  yardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addYardButton: {
    padding: 5,
  },
  // Empty State
  emptyYardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyYardText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyYardSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  submitButton: {
    backgroundColor: '#613EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Error Styles
  inputError: {
    borderColor: redColor,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    color: redColor,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
});

// search globally ,
// facility list screen  changes add search functionality on facility screen ,
// Home screen changes,
// vin details screen changes ,
// make new screens active chips, in-active chips , and low battery chips  and add   logos and header changes
