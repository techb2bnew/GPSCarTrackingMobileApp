import React, { useState, useEffect } from 'react';
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
  const { yardId, yardName } = route?.params || {};

  // Get yard name from parkingYards
  const currentYard = parkingYards.find(yard => yard?.id === yardId);
  const displayYardName = yardName || currentYard?.name || 'Parking Yard';

  // Local storage key for this yard
  const storageKey = `yard_${yardId}_vehicles`;

  // Load vehicles from local storage
  const loadVehiclesFromStorage = async () => {
    try {
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      if (savedVehicles) {
        const parsedVehicles = JSON.parse(savedVehicles);
        setVehicles(parsedVehicles);
        setFilteredVehicles(parsedVehicles);
        setHasBeenInitialized(true);
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

  const fetchVehicleDetails = async vinNumber => {
    try {
      setIsLoading(true);
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
    <View style={styles.vehicleCard}>
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
    </View>
  );

  const renderNoVehicles = () => (
    <View style={[styles.noVehicleContainer, alignJustifyCenter]}>
      <Ionicons name="car-outline" size={80} color="#ccc" />
      <Text style={styles.noVehicleText}>No Vehicles Found</Text>
      <Text style={[styles.noVehicleSubtext, textAlign]}>
        This yard "{displayYardName}" has no vehicles
      </Text>
      <CustomButton
        title="Add Vehicle"
        onPress={handleAddVehicle}
        style={styles.addVehicleButton}
      />
    </View>
  );

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
          <Text style={styles.yardTitle}>{displayYardName}</Text>
          <Text style={styles.vehiclesCount}>
            {searchQuery ? filteredVehicles.length : vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'} 
            {searchQuery && ` (${vehicles.length} total)`}
          </Text>
          {currentYard && currentYard.address && (
            <Text style={styles.yardAddress}>{currentYard.address}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleAddVehicle}
          style={styles.addMoreButton}
          activeOpacity={0.8}
        >
          <View style={[flexDirectionRow, alignJustifyCenter]}>
            <Text style={styles.addMoreButtonText}>Add More Vehicle</Text>
          </View>
        </TouchableOpacity>
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
          onPress={() => navigation.navigate('HomeScreen')}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yard Details</Text>
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
  headerTitle: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
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