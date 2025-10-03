// ParkingYardScreen.js
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   SafeAreaView,
//   ImageBackground,
// } from 'react-native';
// import {parkingYards} from '../constants/Constants';
// import useFacilityFetch from '../hooks/useFacilityFetch';

// const {width} = Dimensions.get('window');

// const ParkingYardScreen = ({navigation}) => {
//   const [selectedYard, setSelectedYard] = useState(null);

//   const renderItem = ({item}) => {
//     const isSelected = item?.id === selectedYard;

//     return (
//       <TouchableOpacity
//         style={[styles.card, isSelected && styles.selectedCard]}
//         onPress={() => {
//           setSelectedYard(item?.id),
//             navigation.navigate('YardDetailsScreen', {isSelected: item?.id});
//         }}>
//         <Text style={[styles.name, isSelected && styles.selectedText]}>
//           {item?.name}
//         </Text>
//         <Text style={[styles.address, isSelected && styles.selectedText]}>
//           {item?.address}
//         </Text>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <SafeAreaView style={{flex: 1}}>
//       <ImageBackground
//         style={{flex: 1}}
//         // source={IMAGE_BACKGROUND_IMAGE}
//         resizeMode="cover">
//         <View style={styles.container}>
//           <Text style={styles.title}>Parking Yards</Text>
//           {/* <FlatList
//             data={parkingYards}
//             keyExtractor={item => item.id}
//             renderItem={renderItem}
//             numColumns={2}
//             columnWrapperStyle={styles.row}
//             contentContainerStyle={styles.listContainer}
//           /> */}
//           <FlatList
//             data={parkingYards}
//             keyExtractor={item => item.id}
//             renderItem={renderItem}
//             contentContainerStyle={styles.listContainer} // keep padding
//           />
//         </View>
//       </ImageBackground>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 20,
//     paddingHorizontal: 16,
//     // backgroundColor: '#fff',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginBottom: 20,
//   },
//   listContainer: {
//     paddingBottom: 20,
//   },
//   row: {
//     justifyContent: 'space-between',
//     marginBottom: 16,
//   },
//   // card: {
//   //   width: (width - 48) / 2,
//   //   borderWidth: 1,
//   //   borderColor: '#c1b7ed',
//   //   borderRadius: 10,
//   //   padding: 12,
//   //   paddingVertical: 20,
//   //   backgroundColor: '#fff',
//   //   alignItems: 'center',
//   //   justifyContent: 'center',
//   // },
//   selectedCard: {
//     backgroundColor: '#d6d3e6',
//     borderColor: '#613EEA',
//   },
//   // name: {
//   //   fontWeight: 'bold',
//   //   fontSize: 17,
//   //   color: '#252837',
//   //   marginBottom: 4,
//   //   textAlign: 'center',
//   // },
//   // address: {
//   //   fontSize: 13,
//   //   color: '#252837',
//   //   textAlign: 'center',
//   // },
//   card: {
//     width: '100%', // full width
//     borderWidth: 1,
//     borderColor: '#c1b7ed',
//     borderRadius: 10,
//     padding: 16,
//     marginBottom: 12, // spacing between rows
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//   },
//   name: {
//     fontWeight: 'bold',
//     fontSize: 17,
//     color: '#252837',
//     marginBottom: 4,
//   },
//   address: {
//     fontSize: 13,
//     color: '#252837',
//   },
//   selectedText: {
//     color: '#613EEA',
//   },
// });

// export default ParkingYardScreen;
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-simple-toast';
import {parkingYards} from '../constants/Constants';
import useFacilityFetch from '../hooks/useFacilityFetch';
import {heightPercentageToDP} from '../utils';
import { redColor } from '../constants/Color';

const ParkingYardScreen = ({navigation}) => {
  const [selectedYard, setSelectedYard] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  // Dynamic yards state
  const [yards, setYards] = useState([]);
  const [filteredYards, setFilteredYards] = useState([]);
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
        const parsedYards = JSON.parse(savedYards);
        setYards(parsedYards);
        setFilteredYards(parsedYards);
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

  // Search filter
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredYards(yards);
    } else {
      const filtered = yards.filter(yard =>
        yard?.name?.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredYards(filtered);
    }
  }, [searchText, yards]);

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

    clearFormData();
    setShowAddYardModal(false);

    Toast.show('✅ Yard added successfully!', Toast.LONG);
  };

  const renderItem = ({item}) => {
    const isSelected = item?.id === selectedYard;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => {
          setSelectedYard(item?.id),
            navigation.navigate('YardDetailsScreen', {isSelected: item?.id});
        }}>
        <Text style={[styles.name, isSelected && styles.selectedText]}>
          {item?.name}
        </Text>
        <Text style={[styles.address, isSelected && styles.selectedText]}>
          {item?.address}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ImageBackground style={{flex: 1}} resizeMode="cover">
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icon name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.title}>Parking Yards</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddYardModal(true)}
            >
              <Icon name="add-circle" size={32} color="#613EEA" />
            </TouchableOpacity>
          </View>

          {/* 🔍 Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search parking yard..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* 📝 List */}
          {yards.length > 0 ? (
            <FlatList
              data={filteredYards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <Text style={styles.noData}>No Parking Yard Found</Text>
              }
            />
          ) : (
            <View style={styles.emptyYardContainer}>
              <Icon name="business-outline" size={80} color="#ccc" />
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
                        <Icon name="close" size={28} color="#666" />
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
                            <Icon name="alert-circle" size={16} color={redColor} />
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
                            <Icon name="alert-circle" size={16} color={redColor} />
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
                            <Icon name="alert-circle" size={16} color={redColor} />
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
                        <Icon name="checkmark-circle" size={24} color="#fff" />
                        <Text style={styles.submitButtonText}>Add Yard</Text>
                      </TouchableOpacity>
                      
                      <View style={{height: 20}} />
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    height: heightPercentageToDP(5),
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  selectedCard: {
    backgroundColor: '#d6d3e6',
    borderColor: '#613EEA',
  },
  name: {
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
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
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

export default ParkingYardScreen;
