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
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-simple-toast';
import { parkingYards } from '../constants/Constants';
import useFacilityFetch from '../hooks/useFacilityFetch';
import { heightPercentageToDP, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';
import { redColor, whiteColor, blackColor, grayColor } from '../constants/Color';
import { spacings, style } from '../constants/Fonts';

const ParkingYardScreen = ({ navigation }) => {
  const [selectedYard, setSelectedYard] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Dynamic yards state
  const [yards, setYards] = useState([]);
  const [filteredYards, setFilteredYards] = useState([]);
  const [showAddYardModal, setShowAddYardModal] = useState(false);
  const [editingYard, setEditingYard] = useState(null);
  const [yardName, setYardName] = useState('');
  const [yardSlots, setYardSlots] = useState('');
  const [yardAddress, setYardAddress] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({
    yardName: '',
    yardSlots: '',
    yardAddress: '',
  });

  // Helper function to get slot information for a yard
  const getSlotInfo = async (yardId) => {
    try {
      const storageKey = `yard_${yardId}_vehicles`;
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;
      
      // Find the yard to get total slots
      const yard = yards.find(y => y.id === yardId) || parkingYards.find(y => y.id === yardId);
      const totalSlots = parseInt(yard?.slots) || 50; // Default to 50 if not specified
      const availableSlots = Math.max(0, totalSlots - vehicleCount);
      
      return {
        total: totalSlots,
        occupied: vehicleCount,
        available: availableSlots
      };
    } catch (error) {
      console.error('Error calculating slot info:', error);
      return { total: 50, occupied: 0, available: 50 };
    }
  };

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
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Clear form data
  const clearFormData = () => {
    setYardName('');
    setYardSlots('');
    setYardAddress('');
    setErrors({ yardName: '', yardSlots: '', yardAddress: '' });
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

  // Open edit yard modal
  const handleOpenEditYard = (yard) => {
    setEditingYard(yard);
    setYardName(yard.name);
    setYardAddress(yard.address);
    setYardSlots(yard.slots.toString());
    setShowAddYardModal(true); // Same modal reuse
  };

  // Update yard
  const handleUpdateYard = async () => {
    if (!validateForm()) {
      return;
    }

    const newSlots = parseInt(yardSlots);

    // Check if reducing slots below current vehicle count
    const storageKey = `yard_${editingYard.id}_vehicles`;
    const savedVehicles = await AsyncStorage.getItem(storageKey);
    const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;

    if (newSlots < vehicleCount) {
      Alert.alert(
        'Cannot Reduce Slots',
        `This yard has ${vehicleCount} vehicles. You cannot reduce slots below ${vehicleCount}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const updatedYards = yards.map(y =>
      y.id === editingYard.id
        ? { ...y, name: yardName, address: yardAddress, slots: newSlots, updatedAt: new Date().toISOString() }
        : y
    );

    setYards(updatedYards);
    setFilteredYards(updatedYards);
    await saveYards(updatedYards);

    clearFormData();
    setEditingYard(null);
    setShowAddYardModal(false);

    Toast.show('✅ Yard updated successfully!', Toast.LONG);
  };

  // Delete yard
  const handleDeleteYard = async (yard) => {
    const storageKey = `yard_${yard.id}_vehicles`;
    const savedVehicles = await AsyncStorage.getItem(storageKey);
    const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;

    if (vehicleCount > 0) {
      Alert.alert(
        'Cannot Delete Yard',
        `This yard has ${vehicleCount} vehicles. Please remove all vehicles first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Yard',
      `Are you sure you want to delete "${yard.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedYards = yards.filter(y => y.id !== yard.id);
            setYards(updatedYards);
            setFilteredYards(updatedYards);
            await saveYards(updatedYards);
            
            await AsyncStorage.removeItem(storageKey);
            
            Toast.show('✅ Yard deleted successfully!', Toast.LONG);
          }
        }
      ]
    );
  };

  // Yard Card Component with dynamic slot info
  const YardCard = ({ item, isSelected, onPress }) => {
    const [slotInfo, setSlotInfo] = useState({ total: item?.slots || 50, occupied: 0, available: item?.slots || 50 });

    useEffect(() => {
      const loadSlotInfo = async () => {
        const info = await getSlotInfo(item.id);
        setSlotInfo(info);
      };
      loadSlotInfo();
    }, [item.id]);

    const displayName = item?.name?.charAt(0).toUpperCase() + item?.name?.slice(1);

    return (
      <TouchableOpacity
        style={[styles.simpleYardCard, isSelected && styles.selectedSimpleCard]}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.yardCardHeader}>
          <View style={styles.simpleCardLeft}>
            <View style={styles.simpleIconContainer}>
              <Ionicons name="business" size={24} color="#613EEA" />
            </View>
            <View style={styles.simpleTextContainer}>
              <Text style={[styles.simpleYardName, isSelected && styles.selectedText]}>
                {displayName}
              </Text>
              <Text style={[styles.simpleYardAddress, isSelected && styles.selectedText]}>
                {item?.address}
              </Text>
              {slotInfo.available === 0 ? (
                <View style={styles.fullYardContainer}>
                  <Ionicons name="warning" size={16} color="#FF6B6B" />
                  <Text style={styles.fullYardText}>
                    Yard is full! ({slotInfo.total}/{slotInfo.total} slots)
                  </Text>
                </View>
              ) : (
                <Text style={styles.simpleSlotText}>
                  {slotInfo.available} available • {slotInfo.total} total slots
                </Text>
              )}
            </View>
          </View>
          
          {/* Edit & Delete Buttons - Top Right */}
          <View style={styles.yardCardActions}>
            <TouchableOpacity
              style={styles.editYardButton}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenEditYard(item);
              }}>
              <Ionicons name="pencil" size={18} color="#613EEA" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteYardButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteYard(item);
              }}>
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = item?.id === selectedYard;

    return (
      <YardCard
        item={item}
        isSelected={isSelected}
        onPress={() => {
          setSelectedYard(item?.id);
          navigation.navigate('YardDetailScreen', {
            yardId: item?.id,
            yardName: item?.name,
            fromScreen: 'ParkingYardScreen'
          });
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Parking Yards</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddYardModal(true)}
          >
            <Ionicons name="add-circle" size={32} color="#613EEA" />
          </TouchableOpacity>
        </View>

        {/* 🔍 Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
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
              <TouchableWithoutFeedback onPress={() => { }}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingYard ? 'Edit Parking Yard' : 'Add New Parking Yard'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      clearFormData();
                      setEditingYard(null);
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
                        editingYard ? handleUpdateYard() : handleAddYard();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {editingYard ? 'Update Yard' : 'Add Yard'}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
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
  // Simple Yard Cards (Clean Design - Same as HomeScreen)
  simpleYardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedSimpleCard: {
    borderColor: '#613EEA',
    borderWidth: 2,
    backgroundColor: '#faf9ff',
  },
  yardCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  simpleCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  simpleIconContainer: {
    backgroundColor: '#f3f0ff',
    borderRadius: 8,
    padding: 6,
    marginRight: 10,
  },
  simpleTextContainer: {
    flex: 1,
  },
  simpleYardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  simpleYardAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  slotInfoContainer: {
    marginTop: 2,
  },
  simpleSlotText: {
    fontSize: 12,
    color: '#613EEA',
    fontWeight: '600',
  },
  fullYardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fullYardText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  totalSlotText: {
    fontSize: 11,
    color: '#999',
  },
  yardCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editYardButton: {
    backgroundColor: '#f3f0ff',
    padding: 8,
    borderRadius: 8,
  },
  deleteYardButton: {
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 8,
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
