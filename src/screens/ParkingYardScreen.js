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
//     borderColor: '#003F65',
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
//     color: '#003F65',
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
  Alert,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-simple-toast';
import { supabase } from '../lib/supabaseClient';
import { parkingYards } from '../constants/Constants';
import useFacilityFetch from '../hooks/useFacilityFetch';
import { heightPercentageToDP, heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';
import { redColor, whiteColor, blackColor, grayColor, greenColor } from '../constants/Color';
import { spacings, style } from '../constants/Fonts';
import { useFocusEffect } from '@react-navigation/native';

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

  // Search vehicles state
  const [allVehicles, setAllVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [isSearchingVehicles, setIsSearchingVehicles] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({
    yardName: '',
    yardSlots: '',
    yardAddress: '',
  });

  // Helper function to get slot information for a yard
  const getSlotInfo = async (yardId) => {
    try {
      // console.log(`🔍 Getting slot info for yard ID: ${yardId}`);

      // Get yard info from yards state (dynamic yards from Supabase)
      let yard = yards.find(y => y.id === yardId);
      if (!yard) {
        yard = parkingYards.find(y => y.id === yardId);
      }

      const yardName = yard?.name || 'Unknown Yard';
      const totalSlots = parseInt(yard?.slots) || 50;

      // Get vehicle count from Supabase for this yard
      const { data: vehicles, error } = await supabase
        .from('cars')
        .select('id', { count: 'exact' })
        .eq('facilityId', yard.id);

      if (error) {
        console.error('❌ Error fetching vehicle count:', error);
        return { total: totalSlots, occupied: 0, available: totalSlots };
      }

      const vehicleCount = vehicles?.length || 0;
      const availableSlots = Math.max(0, totalSlots - vehicleCount);

      // console.log(`✅ Slot info for ${yardName}: ${vehicleCount}/${totalSlots} (${availableSlots} available)`);

      return {
        total: totalSlots,
        occupied: vehicleCount,
        available: availableSlots
      };
    } catch (error) {
      console.error('❌ Error calculating slot info:', error);
      return { total: 50, occupied: 0, available: 50 };
    }
  };

  // Load yards from AsyncStorage
  useEffect(() => {
    loadYards();
    loadAllVehicles();
  }, []);

  // Load all vehicles for search
  const loadAllVehicles = async () => {
    try {
      console.log('🔍 [ParkingYardScreen] Loading all vehicles for search...');
      
      // Get all vehicles from Supabase
      const { data: vehicles, error } = await supabase
        .from('cars')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('❌ [ParkingYardScreen] Error loading vehicles:', error);
        setAllVehicles([]);
        return;
      }

      // Fetch facility names for all vehicles
      const facilityIds = [...new Set(vehicles.map(v => v.facilityId).filter(Boolean))];
      const facilityMap = {};
      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from('facility')
          .select('id, name')
          .in('id', facilityIds);
        if (facilities) {
          facilities.forEach(f => {
            facilityMap[f.id] = f.name;
          });
        }
      }

      // Transform to match app format
      const allVehiclesData = vehicles.map(vehicle => ({
        id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        slotNo: vehicle.slotNo,
        chipId: vehicle.chip,
        chip: vehicle.chip,
        facilityId: vehicle.facilityId,
        parkingYard: facilityMap[vehicle.facilityId] || vehicle.facilityId || 'Unknown Yard',
        yardId: vehicle.facilityId,
        isActive: vehicle.chip ? true : false,
      }));

      console.log(`✅ [ParkingYardScreen] Loaded ${allVehiclesData.length} vehicles for search`);
      setAllVehicles(allVehiclesData);
    } catch (error) {
      console.error('❌ [ParkingYardScreen] Error loading vehicles:', error);
      setAllVehicles([]);
    }
  };

  const loadYards = async () => {
    try {
      console.log('🔄 [ParkingYardScreen] Loading yards from Supabase (real-time)...');

      // Fetch from Supabase - Primary source
      const { data: supabaseYards, error } = await supabase
        .from('facility')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('❌ [ParkingYardScreen] Supabase fetch error:', error);
        // Fallback to local storage backup if Supabase fails
        const savedYards = await AsyncStorage.getItem('parking_yards');
        if (savedYards) {
          console.log('⚠️ [ParkingYardScreen] Using local backup data');
          const parsedYards = JSON.parse(savedYards);
          setYards(parsedYards);
          setFilteredYards(parsedYards);
        } else {
          setYards([]);
          setFilteredYards([]);
        }
        return;
      }

      console.log('✅ [ParkingYardScreen] Fetched from Supabase:', supabaseYards.length, 'yards');

      // Map Supabase data to app format
      const mappedYards = supabaseYards.map(yard => ({
        id: yard.id.toString(),
        name: yard.name || 'Unnamed Yard',
        address: yard.address ? `${yard.address}${yard.city ? ', ' + yard.city : ''}` : 'No Address',
        slots: yard.parkingSlots ? parseInt(yard.parkingSlots) : 50,
        source: 'supabase',
        createdAt: yard.created_at || new Date().toISOString(),
      }));

      // Use ONLY Supabase data (real-time)
      setYards(mappedYards);
      setFilteredYards(mappedYards);

      // Save to local storage as backup only
      await AsyncStorage.setItem('parking_yards', JSON.stringify(mappedYards));

      console.log('📊 [ParkingYardScreen] Real-time yards:', mappedYards.length);
      if (mappedYards.length === 0) {
        console.log('📭 [ParkingYardScreen] No yards found - Show Add Yard option');
      }

    } catch (error) {
      console.error('❌ [ParkingYardScreen] Error loading yards:', error);
      // Fallback to local storage backup
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        console.log('⚠️ [ParkingYardScreen] Using local backup data (Error occurred)');
        const parsedYards = JSON.parse(savedYards);
        setYards(parsedYards);
        setFilteredYards(parsedYards);
      } else {
        setYards([]);
        setFilteredYards([]);
      }
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

  // Search filter - VIN, Chip, Yard search
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredYards(yards);
      setFilteredVehicles([]);
      setIsSearchingVehicles(false);
    } else {
      const lowerText = searchText.toLowerCase();
      
      // Search in vehicles (VIN, Chip, Yard)
      const filteredVeh = allVehicles?.filter(item => {
        return (
          item.vin?.toLowerCase().includes(lowerText) ||
          item.chipId?.toLowerCase().includes(lowerText) ||
          item.parkingYard?.toLowerCase().includes(lowerText) ||
          item.make?.toLowerCase().includes(lowerText) ||
          item.model?.toLowerCase().includes(lowerText)
        );
      });
      
      if (filteredVeh && filteredVeh.length > 0) {
        setFilteredVehicles(filteredVeh);
        setIsSearchingVehicles(true);
        setFilteredYards([]);
      } else {
        // Fallback to yard search if no vehicles found
        const filtered = yards.filter(yard =>
          yard?.name?.toLowerCase().includes(lowerText),
        );
        setFilteredYards(filtered);
        setFilteredVehicles([]);
        setIsSearchingVehicles(false);
      }
    }
  }, [searchText, yards, allVehicles]);

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

    try {
      console.log('🔄 [ParkingYardScreen] Adding yard to Supabase...');

      // Generate unique ID
      const newId = Date.now();

      // Prepare data for Supabase
      const supabaseYard = {
        id: newId,
        name: yardName,
        address: yardAddress,
        parkingSlots: parseInt(yardSlots),
        city: '',
        lat: '',
        long: '',
      };

      // 1. Insert to Supabase first
      const { data, error } = await supabase
        .from('facility')
        .insert([supabaseYard])
        .select();

      if (error) {
        console.error('❌ [ParkingYardScreen] Supabase insert error:', error);
        Alert.alert('Error', `Failed to add yard to database: ${error.message}`);
        return;
      }

      console.log('✅ [ParkingYardScreen] Added to Supabase:', data);

      // 2. Prepare data for local storage
      const newYard = {
        id: newId.toString(),
        name: yardName,
        address: yardAddress,
        slots: parseInt(yardSlots),
        source: 'supabase',
        createdAt: new Date().toISOString(),
      };

      // 3. Update local storage
      const updatedYards = [...yards, newYard];
      setYards(updatedYards);
      setFilteredYards(updatedYards);
      await saveYards(updatedYards);

      console.log('✅ [ParkingYardScreen] Added to local storage');

      clearFormData();
      setShowAddYardModal(false);

      Toast.show('✅ Yard added successfully!', Toast.LONG);

    } catch (error) {
      console.error('❌ [ParkingYardScreen] Error adding yard:', error);
      Alert.alert('Error', `Failed to add yard: ${error.message}`);
    }
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

    try {
      console.log('🔄 [ParkingYardScreen] Updating yard in Supabase...');

      // 1. Update in Supabase first
      const { data, error } = await supabase
        .from('facility')
        .update({
          name: yardName,
          address: yardAddress,
          parkingSlots: newSlots,
        })
        .eq('id', editingYard.id)
        .select();

      if (error) {
        console.error('❌ [ParkingYardScreen] Supabase update error:', error);
        Alert.alert('Error', `Failed to update yard: ${error.message}`);
        return;
      }

      console.log('✅ [ParkingYardScreen] Updated in Supabase:', data);

      // 2. Update local storage
      const updatedYards = yards.map(y =>
        y.id === editingYard.id
          ? { ...y, name: yardName, address: yardAddress, slots: newSlots, updatedAt: new Date().toISOString() }
          : y
      );

      setYards(updatedYards);
      setFilteredYards(updatedYards);
      await saveYards(updatedYards);

      console.log('✅ [ParkingYardScreen] Updated in local storage');

      clearFormData();
      setEditingYard(null);
      setShowAddYardModal(false);

      Toast.show('✅ Yard updated successfully!', Toast.LONG);

    } catch (error) {
      console.error('❌ [ParkingYardScreen] Error updating yard:', error);
      Alert.alert('Error', `Failed to update yard: ${error.message}`);
    }
  };

  // Delete yard
  const handleDeleteYard = async (yard) => {
    try {
      // Check vehicle count from Supabase (not AsyncStorage)
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('cars')
        .select('id')
        .eq('facilityId', yard.id);

      if (vehiclesError) {
        console.error('❌ [ParkingYardScreen] Error fetching vehicles:', vehiclesError);
        Alert.alert('Error', 'Failed to check yard vehicles');
        return;
      }

      const vehicleCount = vehicles ? vehicles.length : 0;
      console.log(`🔍 [ParkingYardScreen] Yard "${yard.name}" has ${vehicleCount} vehicles`);

      // Determine confirmation message based on vehicle count
      const confirmationMessage = vehicleCount > 0
        ? `This yard has ${vehicleCount} vehicles. Deleting this yard will also delete all ${vehicleCount} vehicles. Are you sure you want to proceed?`
        : `Are you sure you want to delete "${yard.name}"?`;

      Alert.alert(
        'Delete Yard',
        confirmationMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔄 [ParkingYardScreen] Deleting yard and vehicles from Supabase...');

                // 1. First delete all vehicles in this yard
                if (vehicleCount > 0) {
                  const { error: vehiclesDeleteError } = await supabase
                    .from('cars')
                    .delete()
                    .eq('facilityId', yard.id);

                  if (vehiclesDeleteError) {
                    console.error('❌ [ParkingYardScreen] Error deleting vehicles:', vehiclesDeleteError);
                    Alert.alert('Error', `Failed to delete vehicles: ${vehiclesDeleteError.message}`);
                    return;
                  }
                  console.log(`✅ [ParkingYardScreen] Deleted ${vehicleCount} vehicles from yard`);
                }

                // 2. Delete the yard itself
                const { error: yardDeleteError } = await supabase
                  .from('facility')
                  .delete()
                  .eq('id', yard.id);

                if (yardDeleteError) {
                  console.error('❌ [ParkingYardScreen] Supabase delete error:', yardDeleteError);
                  Alert.alert('Error', `Failed to delete yard: ${yardDeleteError.message}`);
                  return;
                }

                console.log('✅ [ParkingYardScreen] Deleted yard from Supabase');

                // 3. Update local storage
                const updatedYards = yards.filter(y => y.id !== yard.id);
                setYards(updatedYards);
                setFilteredYards(updatedYards);
                await saveYards(updatedYards);

                // 4. Remove yard vehicles storage key (cleanup)
                const storageKey = `yard_${yard.id}_vehicles`;
                await AsyncStorage.removeItem(storageKey);

                console.log('✅ [ParkingYardScreen] Deleted from local storage');

                Toast.show(`✅ Yard and ${vehicleCount} vehicles deleted successfully!`, Toast.LONG);

              } catch (error) {
                console.error('❌ [ParkingYardScreen] Error deleting yard:', error);
                Alert.alert('Error', `Failed to delete yard: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [ParkingYardScreen] Error in handleDeleteYard:', error);
      Alert.alert('Error', 'Failed to process yard deletion');
    }
  };

  // Yard Card Component with dynamic slot info
  const YardCard = ({ item, isSelected, onPress }) => {
    const [slotInfo, setSlotInfo] = useState({ total: item?.slots, occupied: 0, available: item?.slots });

    const loadSlotInfo = async () => {
      const info = await getSlotInfo(item.id);
      setSlotInfo(info);
    };

    useEffect(() => {
      loadSlotInfo();
    }, [item.id]);

    // Refresh slot info when screen comes into focus
    useFocusEffect(
      React.useCallback(() => {
        loadSlotInfo();
      }, [item.id])
    );

    const displayName = item?.name?.charAt(0).toUpperCase() + item?.name?.slice(1);

    return (
      <TouchableOpacity
        style={[styles.simpleYardCard]}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.yardCardHeader}>
          <View style={styles.simpleCardLeft}>
            <View style={styles.simpleIconContainer}>
              <Ionicons name="business" size={24} color="#003F65" />
            </View>
            <View style={styles.simpleTextContainer}>
              <Text style={[styles.simpleYardName]}>
                {displayName}
              </Text>
              <Text style={[styles.simpleYardAddress]}>
                {item?.address}
              </Text>
              {/* {slotInfo.available === 0 ? (
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
              )} */}
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
              <Ionicons name="pencil" size={18} color="#003F65" />
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

  // Render vehicle item for search results
  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() =>
        navigation.navigate('VehicleDetailsScreen', {
          vehicle: item,
          yardName: item.parkingYard,
          yardId: item.yardId
        })
      }>
      <View style={styles.vehicleCardHeader}>
        <Text style={styles.vehicleVin}>{item.vin}</Text>
        {item.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      <Text style={styles.vehicleInfo}>
        {item.make} {item.model}
      </Text>
      {item.color && (
        <Text style={styles.vehicleColorInfo}>Color: {item.color}</Text>
      )}
      <View style={styles.vehicleCardFooter}>
        <Text style={styles.vehicleYardInfo}>📍 {item.parkingYard}</Text>
        {item.slotNo && (
          <Text style={styles.vehicleSlotInfo}>Slot: {item.slotNo}</Text>
        )}
      </View>
      {item.chipId && (
        <Text style={styles.vehicleChipInfo}>🔗 Chip: {item.chipId}</Text>
      )}
    </TouchableOpacity>
  );

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
            <Ionicons name="add-circle" size={32} color="#003F65" />
          </TouchableOpacity>
        </View>

        {/* 🔍 Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search VIN, Chip, Yard, Make, Model..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>

        {/* 📝 List - Vehicles or Yards */}
        {searchText.trim() === '' ? (
          // Default: Show yards
          yards.length > 0 ? (
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
                Add your first parking yard to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => setShowAddYardModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.emptyAddButtonText}>Add Parking Yard</Text>
              </TouchableOpacity>
            </View>
          )
        ) : isSearchingVehicles ? (
          // Search results: Show vehicles
          filteredVehicles.length > 0 ? (
            <FlatList
              data={filteredVehicles}
              keyExtractor={item => item.id.toString()}
              renderItem={renderVehicleItem}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyYardContainer}>
              <Ionicons name="search-outline" size={50} color="#ccc" />
              <Text style={styles.emptyYardText}>No vehicles found</Text>
            </View>
          )
        ) : (
          // Fallback: Show filtered yards
          filteredYards.length > 0 ? (
            <FlatList
              data={filteredYards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyYardContainer}>
              <Ionicons name="search-outline" size={50} color="#ccc" />
              <Text style={styles.emptyYardText}>No results found</Text>
            </View>
          )
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
            <Pressable style={styles.modalOverlay} onPress={() => { setShowAddYardModal(false); clearFormData(); setEditingYard(null); }}>
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
            </Pressable>
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
    paddingTop: spacings.large,
    paddingHorizontal: spacings.large,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.large,
  },
  title: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
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
    paddingHorizontal: spacings.normal,
    marginBottom: spacings.large,
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? hp(5) : hp(5.5),
  },
  searchInput: {
    flex: 1,
    marginLeft: spacings.small,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
  },
  listContainer: {
    paddingBottom: spacings.large,
  },
  // Simple Yard Cards (Clean Design - Same as HomeScreen)
  simpleYardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacings.xxxLarge,
    marginBottom: spacings.normal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedSimpleCard: {
    borderColor: '#003F65',
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
    padding: spacings.small,
    marginRight: spacings.normal,
  },
  simpleTextContainer: {
    flex: 1,
  },
  simpleYardName: {
    fontSize: style.fontSizeSmall2x.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#1a1a1a',
    marginBottom: spacings.xxsmall,
  },
  simpleYardAddress: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    marginBottom: spacings.xxsmall,
  },
  slotInfoContainer: {
    marginTop: spacings.xxsmall,
  },
  simpleSlotText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#003F65',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  fullYardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacings.xxsmall,
  },
  fullYardText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#FF6B6B',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginLeft: spacings.xsmall,
  },
  totalSlotText: {
    fontSize: style.fontSizeExtraSmall.fontSize,
    color: '#999',
  },
  yardCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.small,
  },
  editYardButton: {
    backgroundColor: '#f3f0ff',
    padding: spacings.small,
    borderRadius: 8,
  },
  deleteYardButton: {
    backgroundColor: '#FFF5F5',
    padding: spacings.small,
    borderRadius: 8,
  },
  selectedText: {
    color: '#003F65',
  },
  noData: {
    fontSize: style.fontSizeNormal.fontSize,
    textAlign: 'center',
    marginTop: spacings.ExtraLarge2x,
    color: '#999',
  },
  // Empty State
  emptyYardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacings.ExtraLarge3x,
  },
  emptyYardText: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    marginTop: spacings.large,
    marginBottom: spacings.normal,
  },
  emptyYardSubtext: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: spacings.ExtraLarge2x,
    lineHeight: 20,
    marginBottom: spacings.Large2x,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003F65',
    paddingHorizontal: spacings.xLarge,
    paddingVertical: spacings.xLarge,
    borderRadius: 12,
    gap: spacings.normal,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
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
    backgroundColor: '#003F65',
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
  // Vehicle Card Styles (for search results) - Same as SearchScreen
  vehicleCard: {
    padding: spacings.large,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.small,
  },
  vehicleVin: {
    fontWeight: style.fontWeightThin1x.fontWeight,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#333',
  },
  activeBadge: {
    backgroundColor: greenColor,
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.xsmall,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontWeight: style.fontWeightMedium.fontWeight,
    fontSize: style.fontSizeSmall.fontSize,
    color: '#fff',
  },
  vehicleInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginBottom: spacings.xxsmall,
  },
  vehicleColorInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#888',
    marginBottom: spacings.small,
  },
  vehicleCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  vehicleYardInfo: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#003F65',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  vehicleSlotInfo: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#FF6B35',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  vehicleChipInfo: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#28a745',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginTop: 4,
  },
});

export default ParkingYardScreen;
