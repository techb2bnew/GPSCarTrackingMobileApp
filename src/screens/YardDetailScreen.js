import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CustomButton from '../components/CustomButton';
import { parkingYards } from '../constants/Constants';
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';
const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const YardDetailScreen = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBeenInitialized, setHasBeenInitialized] = useState(false);
  const [showVinModal, setShowVinModal] = useState(false);
  const [scannedVinData, setScannedVinData] = useState(null);
  const [isScanningChip, setIsScanningChip] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [slotInfo, setSlotInfo] = useState({ total: 50, occupied: 0, available: 50 });
  const { yardId, yardName, fromScreen } = route?.params || {};
  const duplicateTimeoutRef = useRef(null);

  // Get yard name - first check dynamic yards, then static yards
  const [currentYard, setCurrentYard] = useState(null);
  const displayYardName = yardName || currentYard?.name || 'Parking Yard';

  // Local storage key for this yard
  const storageKey = `yard_${yardId}_vehicles`;

  // Handle back navigation based on source screen
  const handleBackNavigation = () => {
    if (fromScreen === 'ScannerScreen') {
      // If coming from ScannerScreen, switch to Home tab
      navigation.navigate('HomeScreen');
    } else {
      // Otherwise use normal back navigation
      navigation.goBack();
    }
  };

  // Load current yard information
  const loadCurrentYard = async () => {
    try {
      // First check in AsyncStorage for dynamic yards (user-created yards)
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        const dynamicYards = JSON.parse(savedYards);
        const foundYard = dynamicYards.find(yard => yard?.id === yardId);
        if (foundYard) {
          setCurrentYard(foundYard);
          return foundYard;
        }
      }

      // If not found in dynamic yards, check in static parkingYards
      const staticYard = parkingYards.find(yard => yard?.id === yardId);
      if (staticYard) {
        setCurrentYard(staticYard);
        return staticYard;
      }

      // If still not found, create a default yard
      const defaultYard = { id: yardId, name: 'Unknown Yard', slots: 50 };
      setCurrentYard(defaultYard);
      return defaultYard;
    } catch (error) {
      console.error('Error loading current yard:', error);
      const defaultYard = { id: yardId, name: 'Unknown Yard', slots: 50 };
      setCurrentYard(defaultYard);
      return defaultYard;
    }
  };

  // Helper function to calculate slot information
  const calculateSlotInfo = (vehicleList, yardData = null) => {
    try {
      const yard = yardData || currentYard;
      const totalSlots = parseInt(yard?.slots) || 50;
      const occupied = vehicleList.length;
      const available = Math.max(0, totalSlots - occupied);

      return {
        total: totalSlots,
        occupied: occupied,
        available: available
      };
    } catch (error) {
      console.error('Error calculating slot info:', error);
      return { total: 50, occupied: 0, available: 50 };
    }
  };

  // Load vehicles from local storage
  const loadVehiclesFromStorage = async () => {
    try {
      // First load the current yard information
      const yardData = await loadCurrentYard();

      const savedVehicles = await AsyncStorage.getItem(storageKey);
      if (savedVehicles) {
        const parsedVehicles = JSON.parse(savedVehicles);
        setVehicles(parsedVehicles);
        setFilteredVehicles(parsedVehicles);
        setHasBeenInitialized(true);

        // Calculate slot information using the loaded yard data
        const slotData = calculateSlotInfo(parsedVehicles, yardData);
        setSlotInfo(slotData);

        console.log(`Loaded ${parsedVehicles.length} vehicles from storage for yard ${yardId}`);
      } else {
        // If no saved vehicles, initialize with empty array
        setVehicles([]);
        setFilteredVehicles([]);
        setHasBeenInitialized(true);

        // Calculate slot information for empty list using the loaded yard data
        const slotData = calculateSlotInfo([], yardData);
        setSlotInfo(slotData);

        console.log('No vehicles found in storage, initialized with empty array');
      }
    } catch (error) {
      console.error('Error loading vehicles from storage:', error);
    }
  };

  // Save vehicles to local storage
  const saveVehiclesToStorage = async (vehiclesToSave) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(vehiclesToSave));
    } catch (error) {
      console.error('Error saving vehicles to storage:', error);
    }
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const filtered = vehicles.filter(vehicle => {
      const searchLower = query.toLowerCase();
      return (
        vehicle.vin?.toLowerCase().includes(searchLower) ||
        vehicle.make?.toLowerCase().includes(searchLower) ||
        vehicle.model?.toLowerCase().includes(searchLower) ||
        vehicle.chipId?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredVehicles(filtered);
  };

  // Load vehicles from local storage on component mount
  useEffect(() => {
    loadVehiclesFromStorage();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateTimeoutRef.current) {
        clearTimeout(duplicateTimeoutRef.current);
      }
    };
  }, []);

  // Refresh vehicles when screen comes into focus (e.g., returning from VehicleDetailsScreen)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if the screen has been initialized to avoid unnecessary calls
      if (hasBeenInitialized) {
        console.log('YardDetailScreen focused - refreshing vehicle data silently');
        loadVehiclesFromStorage();
      }
    }, [hasBeenInitialized])
  );

  // Initialize existing vehicles on first load (fallback for route params)
  useEffect(() => {
    if (!hasBeenInitialized && route?.params?.existingVehicles && vehicles.length === 0) {
      setVehicles(route?.params?.existingVehicles);
      setFilteredVehicles(route?.params?.existingVehicles);
      setHasBeenInitialized(true);
    }
  }, [route?.params?.existingVehicles, hasBeenInitialized, vehicles.length]);

  // Save vehicles to storage whenever vehicles array changes
  useEffect(() => {
    if (vehicles.length > 0) {
      saveVehiclesToStorage(vehicles);
    }
  }, [vehicles]);

  // Add new VIN from scanner
  useEffect(() => {
    if (route?.params?.vinNumber) {
      fetchVehicleDetails(route?.params?.vinNumber);
    }
  }, [route?.params?.vinNumber]);

  // Check if VIN already exists in any yard
  const checkVinExists = async (vin) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          const foundVehicle = parsedVehicles.find(v => v.vin === vin);
          
          if (foundVehicle) {
            const foundYardId = key.replace('yard_', '').replace('_vehicles', '');
            
            // Get actual yard name from parking_yards
            const savedYards = await AsyncStorage.getItem('parking_yards');
            let actualYardName = `Yard ${foundYardId}`; // fallback
            
            if (savedYards) {
              const yards = JSON.parse(savedYards);
              const yard = yards.find(y => y.id === foundYardId);
              if (yard) {
                actualYardName = yard.name;
              }
            }
            
            return { exists: true, vehicle: foundVehicle, yardName: actualYardName };
          }
        }
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking VIN existence:', error);
      return { exists: false };
    }
  };

  // Check if chip already exists in any yard
  const checkChipExists = async (chipId) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          const foundVehicle = parsedVehicles.find(v => v.chipId === chipId);
          
          if (foundVehicle) {
            const foundYardId = key.replace('yard_', '').replace('_vehicles', '');
            
            // Get actual yard name from parking_yards
            const savedYards = await AsyncStorage.getItem('parking_yards');
            let actualYardName = `Yard ${foundYardId}`; // fallback
            
            if (savedYards) {
              const yards = JSON.parse(savedYards);
              const yard = yards.find(y => y.id === foundYardId);
              if (yard) {
                actualYardName = yard.name;
              }
            }
            
            return { exists: true, vehicle: foundVehicle, yardName: actualYardName, yardId: foundYardId };
          }
        }
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking chip existence:', error);
      return { exists: false };
    }
  };

  const fetchVehicleDetails = async vinNumber => {
    try {
      setIsLoading(true);
      
      // First check if VIN already exists in any yard
      const vinCheck = await checkVinExists(vinNumber);
      if (vinCheck.exists) {
        setDuplicateInfo({
          type: 'vin',
          value: vinNumber,
          yardName: vinCheck.yardName
        });
        setShowDuplicateModal(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVIN/${vinNumber}?format=json`,
      );

      const data = await response.json();

      if (data && data?.Results && data?.Results?.length > 0) {
        const getValue = (variableName) => {
          const found = data?.Results.find(
            (item) => item?.Variable?.toLowerCase() === variableName?.toLowerCase()
          );
          return found?.Value || 'N/A';
        };

        const newVehicle = {
          id: Date.now().toString(), // Generate unique ID
          vin: vinNumber,
          make: getValue('Make'),
          model: getValue('Model'),
          year: getValue('Model Year'),
          fuelType: getValue('Fuel Type - Primary'),
          driveType: getValue('Drive Type'),
          engineCylinders: getValue('Engine Number of Cylinders'),
          transmissionDesc: getValue('Transmission Style'),
          isActive: false, // Default inactive
          chipId: null, // Will be set when chip is assigned
        };

        // Show modal with VIN details instead of directly adding
        setScannedVinData(newVehicle);
        setShowVinModal(true);
      } else {
        console.log('Error', 'No vehicle details found for this VIN');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVehicle = () => {
    navigation.navigate('ScannerScreen', {
      returnTo: 'YardDetailScreen',
      yardId: yardId,
      yardName: displayYardName,
      existingVehicles: vehicles, // Pass current vehicles to preserve them
    });
  };

  const handleAssignChip = async () => {
    try {
      setIsScanningChip(true);

      // Import barcode scanner for chip scanning
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

      const config = {
        license: 't0105HAEAADcNHV64OJlipcqCx3exOR+gSUqL7YqPqsz7SETM98L2Lvx6wS622L8kpqIvn+Jy7Y7dR1SpS4fQIOlJgnXwUlXbAF3cfFzzoBne6J2Tas81yMvxzdMpCv+dSl9nXy279wYdTDrk;t0109HAEAAJRt4MPEuaQhDlCa6yhda0j07Z/FYbFCd65Ty9mXDgoozD8MgTXwcxZlT+cz8Keo0zcHr2z3xne26lirx+S2TPkgLgCnAYbYvK+paIY7esaO4fu5Bfl3PHN1isx7p/zpHJvJbPQNKuw68w==',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        // Extract EUI ID (first 16 characters)
        const chipId = fullText.substring(0, 16);

        console.log('Scanned chip full text:', fullText);
        console.log('Extracted EUI ID:', chipId);

        // Check if chip already exists in any yard
        const chipCheck = await checkChipExists(chipId);
        if (chipCheck.exists) {
          // Clear any existing timeout
          if (duplicateTimeoutRef.current) {
            clearTimeout(duplicateTimeoutRef.current);
          }
          
          // Close VIN modal first
          setShowVinModal(false);
          setScannedVinData(null);
          setIsScanningChip(false);
          
          // Set duplicate info and show modal after delay to ensure VIN modal is fully closed
          setDuplicateInfo({
            type: 'chip',
            value: chipId,
            yardName: chipCheck.yardName,
            vin: chipCheck.vehicle.vin,
            yardId: chipCheck.yardId
          });
          
          duplicateTimeoutRef.current = setTimeout(() => {
            setShowDuplicateModal(true);
          }, 500);
          return;
        }

        // Add vehicle with chip ID
        const vehicleWithChip = {
          ...scannedVinData,
          chipId: chipId,
          isActive: true,
        };

        setVehicles(prevVehicles => {
          const updatedVehicles = [...prevVehicles, vehicleWithChip];
          setFilteredVehicles(updatedVehicles);
          return updatedVehicles;
        });

        // Update slot information after state update
        const updatedVehicles = [...vehicles, vehicleWithChip];
        const slotData = calculateSlotInfo(updatedVehicles);
        setSlotInfo(slotData);
        setShowVinModal(false);
        setScannedVinData(null);

        console.log('Success', `Chip ${chipId} assigned successfully!`);
      } else {
        console.log('Error', 'Chip scanning cancelled or failed');
      }
    } catch (error) {
      console.error('Error scanning chip:', error);
      console.log('Error', 'Failed to scan chip. Please try again.');
    } finally {
      setIsScanningChip(false);
    }
  };

  const handleCancelVin = () => {
    // Add vehicle without chip when user cancels
    if (scannedVinData) {
      const vehicleWithoutChip = {
        ...scannedVinData,
        chipId: null,
        isActive: false,
      };

      console.log('Adding vehicle without chip:', vehicleWithoutChip);
      setVehicles(prevVehicles => {
        const updatedVehicles = [...prevVehicles, vehicleWithoutChip];
        setFilteredVehicles(updatedVehicles);

        // Update slot information
        const slotData = calculateSlotInfo(updatedVehicles);
        setSlotInfo(slotData);

        console.log('Updated vehicles list:', updatedVehicles.length);
        return updatedVehicles;
      });

      setShowVinModal(false);
      setScannedVinData(null);

      console.log('Vehicle Added', 'Vehicle added successfully without chip. You can assign chip later.');
    }
  };

  const handleAssignId = async (vehicleId) => {
    try {
      // Import barcode scanner for chip scanning
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

      const config = {
        license: 't0105HAEAADcNHV64OJlipcqCx3exOR+gSUqL7YqPqsz7SETM98L2Lvx6wS622L8kpqIvn+Jy7Y7dR1SpS4fQIOlJgnXwUlXbAF3cfFzzoBne6J2Tas81yMvxzdMpCv+dSl9nXy279wYdTDrk;t0109HAEAAJRt4MPEuaQhDlCa6yhda0j07Z/FYbFCd65Ty9mXDgoozD8MgTXwcxZlT+cz8Keo0zcHr2z3xne26lirx+S2TPkgLgCnAYbYvK+paIY7esaO4fu5Bfl3PHN1isx7p/zpHJvJbPQNKuw68w==',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        // Extract EUI ID (first 16 characters)
        const chipId = fullText.substring(0, 16);

        console.log('Scanned chip full text:', fullText);
        console.log('Extracted EUI ID:', chipId);

        // Check if chip already exists in any yard
        const chipCheck = await checkChipExists(chipId);
        if (chipCheck.exists) {
          setDuplicateInfo({
            type: 'chip',
            value: chipId,
            yardName: chipCheck.yardName,
            vin: chipCheck.vehicle.vin
          });
          setShowDuplicateModal(true);
          return;
        }

        // Update the specific vehicle with chip ID
        setVehicles(prevVehicles => {
          const updatedVehicles = prevVehicles.map(vehicle =>
            vehicle.id === vehicleId
              ? { ...vehicle, chipId: chipId, isActive: true }
              : vehicle
          );
          setFilteredVehicles(updatedVehicles);
          return updatedVehicles;
        });

        console.log('Success', `Chip ${chipId} assigned successfully!`);
      } else {
        console.log('Info', 'Chip scanning cancelled');
      }
    } catch (error) {
      console.error('Error scanning chip:', error);
      console.log('Error', 'Failed to scan chip. Please try again.');
    }
  };

  const renderVehicleCard = ({ item }) => (
    <Pressable style={styles.vehicleCard}
      onPress={() => {
        navigation.navigate('VehicleDetailsScreen', {
          vehicle: item,
          yardName: displayYardName,
          yardId: yardId
        });
      }}
    >
      <View style={[flexDirectionRow, alignItemsCenter, justifyContentSpaceBetween]}>
        <View style={styles.vehicleTitleContainer}>
          <Text style={styles.vinNumber}>{item?.vin}</Text>
          <Text style={styles.vehicleSpecs}>{item?.year} • {item?.make} {item?.model}</Text>
        </View>


        {item.isActive && item.chipId ? (
          <View style={styles.chipIdTag}>
            <Text style={styles.chipIdText}>Chip: {item.chipId}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => handleAssignId(item?.id)}
          >
            <Text style={styles.assignButtonText}>Assign Chip</Text>
          </TouchableOpacity>
        )}

      </View>
    </Pressable>
  );

  const renderNoVehicles = () => {
    // First letter capital
    const formattedYardName =
      displayYardName?.charAt(0).toUpperCase() + displayYardName?.slice(1);

    return (
      <View style={[styles.noVehicleContainer, alignJustifyCenter]}>
        <Ionicons name="car-outline" size={80} color="#ccc" />
        <Text style={styles.noVehicleText}>No Vehicles Found</Text>
        <Text style={[styles.noVehicleSubtext, textAlign]}>
          This yard "{formattedYardName}" has no vehicles
        </Text>
        <CustomButton
          title="Add Vehicle"
          onPress={handleAddVehicle}
          style={styles.addVehicleButton}
        />
      </View>
    );
  };


  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by VIN, Make, Model, or Chip ID..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderVehicleList = () => (
    <ScrollView style={styles.scrollContainer}>
      <View style={[styles.headerWithButton, justifyContentSpaceBetween, flexDirectionRow, alignItemsCenter]}>
        <View style={styles.titleSection}>
          <Text style={styles.yardTitle}>
            {displayYardName
              ? displayYardName.charAt(0).toUpperCase() + displayYardName.slice(1)
              : ''}
          </Text>
          <Text style={styles.vehiclesCount}>
            {searchQuery ? filteredVehicles.length : vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
            {searchQuery && ` (${vehicles.length} total)`}
          </Text>
          {currentYard && currentYard.address && (
            <Text style={styles.yardAddress}>{currentYard.address}</Text>
          )}
          {slotInfo.available === 0 && (
            <View style={styles.fullYardMessageContainer}>
              <Ionicons name="information-circle" size={16} color="#FF6B6B" />
              <Text style={styles.fullYardMessageText}>
                Cannot add more vehicles - yard is at full capacity
              </Text>
            </View>
          )}
        </View>
        {slotInfo.available > 0 && (
          <TouchableOpacity
            onPress={handleAddVehicle}
            style={styles.addMoreButton}
            activeOpacity={0.8}
          >
            <View style={[flexDirectionRow, alignJustifyCenter]}>
              <Text style={styles.addMoreButtonText}>Add More Vehicle</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {renderSearchBar()}

      <FlatList
        data={filteredVehicles}
        keyExtractor={item => item.id}
        renderItem={renderVehicleCard}
        style={styles.vehicleList}
        ListEmptyComponent={() => (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={60} color="#ccc" />
            <Text style={styles.noResultsText}>No vehicles found</Text>
            <Text style={styles.noResultsSubtext}>
              {searchQuery ? 'Try adjusting your search terms' : 'No vehicles in this yard yet'}
            </Text>
          </View>
        )}
      />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, flexDirectionRow, alignItemsCenter]}>
        <TouchableOpacity
          onPress={handleBackNavigation}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Yard Details</Text>
          <View style={styles.slotInfoHeader}>
            {slotInfo.available === 0 ? (
              <View style={styles.fullYardHeaderContainer}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={styles.fullYardHeaderText}>
                  Yard is full! ({slotInfo.total}/{slotInfo.total} slots)
                </Text>
              </View>
            ) : (
              <Text style={styles.slotInfoText}>
                {slotInfo.available} available • {slotInfo.total} total slots
              </Text>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, alignJustifyCenter]}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Fetching vehicle details...</Text>
        </View>
      ) : (
        vehicles.length === 0 ? renderNoVehicles() : renderVehicleList()
      )}

      {/* VIN Details Modal */}
      <Modal
        visible={showVinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vehicle Details</Text>
              <TouchableOpacity onPress={() => setShowVinModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.vinDetailsContainer}>
              <Text style={styles.vinLabel}>VIN Number:</Text>
              <Text style={styles.vinValue}>{scannedVinData?.vin}</Text>

              <Text style={styles.vinLabel}>Make:</Text>
              <Text style={styles.vinValue}>{scannedVinData?.make}</Text>

              <Text style={styles.vinLabel}>Model:</Text>
              <Text style={styles.vinValue}>{scannedVinData?.model}</Text>

              <Text style={styles.vinLabel}>Year:</Text>
              <Text style={styles.vinValue}>{scannedVinData?.year}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelVin}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.assignChipButton, isScanningChip && styles.disabledButton]}
                onPress={handleAssignChip}
                disabled={isScanningChip}
              >
                {isScanningChip ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.assignChipButtonText}>Assign Chip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Validation Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            {/* Header with Icon */}
            <View style={styles.duplicateModalHeader}>
              <View style={styles.duplicateIconContainer}>
                <Ionicons name="warning" size={40} color="#FF6B6B" />
              </View>
              <Text style={styles.duplicateModalTitle}>
                {duplicateInfo?.type === 'vin' ? 'Duplicate VIN Found' : 'Duplicate Chip Found'}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.duplicateInfoContainer}>
              <Text style={styles.duplicateMainMessage}>
                {duplicateInfo?.type === 'vin' 
                  ? 'This VIN is already added in' 
                  : 'This chip is already assigned to a vehicle in'
                }
              </Text>
              
              {/* Yard Name - Bold Text */}
              <Text style={styles.duplicateYardText}>{duplicateInfo?.yardName}</Text>
              
              {/* VIN Number - Bold Text */}
              <Text style={styles.duplicateVinText}>
                VIN: {duplicateInfo?.type === 'vin' ? duplicateInfo?.value : duplicateInfo?.vin}
              </Text>
              
              {/* Chip ID - Only for chip duplicates */}
              {duplicateInfo?.type === 'chip' && (
                <Text style={styles.duplicateChipText}>
                  Chip: {duplicateInfo?.value}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.duplicateActionsRow}>
              {duplicateInfo?.type === 'vin' ? (
                <>
                  <TouchableOpacity
                    style={styles.duplicateActionButton}
                    onPress={() => {
                      // Close modal then navigate with full params so scanner opens correctly
                      setShowDuplicateModal(false);
                      setTimeout(() => {
                        navigation.navigate('ScannerScreen', {
                          returnTo: 'YardDetailScreen',
                          yardId: yardId,
                          yardName: displayYardName,
                          existingVehicles: vehicles,
                          scanType: 'vin',
                        });
                      }, 200);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duplicateActionButtonText}>Scan New VIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateActionButton}
                    onPress={() => setShowDuplicateModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duplicateActionButtonText}>Got it</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.duplicateActionButton}
                    onPress={async () => {
                      try {
                        // Unassign the duplicate chip from the vehicle it belongs to
                        const foundYardId = duplicateInfo?.yardId;
                        const storageKey = `yard_${foundYardId}_vehicles`;
                        const saved = await AsyncStorage.getItem(storageKey);
                        if (saved) {
                          const list = JSON.parse(saved);
                          const updated = list.map(v => v.chipId === duplicateInfo?.value ? { ...v, chipId: null, isActive: false } : v);
                          await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
                        }
                        loadVehiclesFromStorage();
                        setShowDuplicateModal(false);
                      } catch (e) {
                        console.log('Error unassigning chip:', e);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duplicateActionButtonText}>Unassign Chip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateActionButton}
                    onPress={() => setShowDuplicateModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.duplicateActionButtonText}>Got it</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: wp(100),
    height: hp(100),
    backgroundColor: whiteColor,
  },
  header: {
    padding: spacings.xxxLarge,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: spacings.small,
    marginRight: spacings.xxLarge,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
  },
  slotInfoHeader: {
    marginTop: 2,
  },
  slotInfoText: {
    fontSize: 12,
    color: '#613EEA',
    fontWeight: '600',
  },
  fullYardHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullYardHeaderText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  fullYardMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  fullYardMessageText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: spacings.large,
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: spacings.large,
  },
  headerWithButton: {
    marginVertical: spacings.xxxxLarge,
  },
  titleSection: {
    flex: 1,
  },
  yardTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginBottom: spacings.small,
  },
  vehiclesCount: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
  },
  yardAddress: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    marginTop: 2,
  },
  noVehicleContainer: {
    flex: 1,
    paddingHorizontal: 40,
  },
  noVehicleText: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginTop: spacings.xxxxLarge,
    marginBottom: spacings.large,
  },
  noVehicleSubtext: {
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
    marginBottom: spacings.xxxxLarge,
    lineHeight: 22,
  },
  addVehicleButton: {
    backgroundColor: '#613EEA',
    paddingVertical: spacings.large,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  vehicleCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.xLarge,
    marginBottom: spacings.xxLarge,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleTitleContainer: {
    flex: 1,
  },
  vinNumber: {
    fontSize: style.fontSizeMedium.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginBottom: spacings.small,
  },
  vehicleSpecs: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
  },
  activeTag: {
    backgroundColor: '#d4edda',
    paddingHorizontal: spacings.xLarge,
    paddingVertical: spacings.large,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: greenColor,
  },
  activeText: {
    color: greenColor,
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  assignButton: {
    backgroundColor: '#613EEA',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.large,
    borderRadius: spacings.xxLarge,
  },
  assignButtonText: {
    color: whiteColor,
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  vehicleList: {
    flexGrow: 0,
  },
  addMoreButton: {
    backgroundColor: '#613EEA',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.large,
    borderRadius: 30,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#7B68EE',
    transform: [{ scale: 1 }],
  },
  addMoreButtonText: {
    color: whiteColor,
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    marginLeft: spacings.large,
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  vinDetailsContainer: {
    marginBottom: 25,
  },
  vinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  vinValue: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#613EEA',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  assignChipButton: {
    flex: 1,
    backgroundColor: '#613EEA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  assignChipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Duplicate Validation Modal Styles
  duplicateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    overflow: 'hidden',
  },
  duplicateModalHeader: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  duplicateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  duplicateModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  duplicateInfoContainer: {
    padding: 24,
  },
  duplicateMainMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  duplicateYardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#613EEA',
    textAlign: 'center',
    marginBottom: 16,
  },
  duplicateVinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateChipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateCloseButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  duplicateActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 16,
  },
  duplicateActionButton: {
    flex: 1,
    backgroundColor: '#613EEA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent:"center",
    marginHorizontal: 5,
  },
  duplicateActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign:"center"
  },
  // Chip ID Styles
  chipIdTag: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#20c997',
  },
  chipIdText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Search Bar Styles
  searchContainer: {
    marginBottom: spacings.large,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.medium,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: spacings.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: style.fontSizeNormal.fontSize,
    color: blackColor,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacings.medium,
    padding: 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: spacings.xxxxLarge,
  },
  noResultsText: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginTop: spacings.large,
    marginBottom: spacings.small,
  },
  noResultsSubtext: {
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default YardDetailScreen;