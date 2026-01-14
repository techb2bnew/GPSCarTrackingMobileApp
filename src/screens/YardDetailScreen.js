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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
// Removed AsyncStorage import - now using Supabase directly
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-simple-toast';
import { supabase } from '../lib/supabaseClient';
import { addActiveChip, moveChipToInactive, removeInactiveChip, getTimeAgo } from '../utils/chipManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import CustomButton from '../components/CustomButton';
import { parkingYards } from '../constants/Constants';
import { spacings, style } from '../constants/Fonts';
import { blackColor, blueColor, grayColor, greenColor, lightGrayColor, whiteColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';
const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const YardDetailScreen = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Get current user from Redux store
  const userData = useSelector(state => state.user.userData);
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
  const [showEditYardModal, setShowEditYardModal] = useState(false);
  const [editYardName, setEditYardName] = useState('');
  const [editYardAddress, setEditYardAddress] = useState('');
  const [editYardSlots, setEditYardSlots] = useState('');
  const [vehicleSlotNo, setVehicleSlotNo] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  // Helper function to parse database timestamp to UTC milliseconds
  const parseDatabaseTimestamp = (dbTimestamp) => {
    if (!dbTimestamp) return null;
    
    try {
      // Database format: "2025-11-12T15:01:07.838" (UTC format, without Z)
      // Or: "2025-11-12 15:01:07.838" (with space)
      // Or: "2025-11-12T15:03:08.142Z" (with Z, already UTC)
      
      // If timestamp ends with Z, it's already UTC
      if (dbTimestamp.endsWith('Z')) {
        return new Date(dbTimestamp).getTime();
      }
      
      // Normalize format: replace space with T if needed
      const timestampStr = dbTimestamp.includes('T') ? dbTimestamp : dbTimestamp.replace(' ', 'T');
      
      // Add Z to make it explicit UTC
      const utcTimestamp = new Date(timestampStr + 'Z').getTime();
      
      return utcTimestamp;
    } catch (error) {
      console.error('Error parsing database timestamp:', error);
      // Fallback to simple parsing
      return new Date(dbTimestamp).getTime();
    }
  };

  // Get current user info for history
  const getCurrentUser = () => {
    try {
      if (userData) {
        console.log("📚 [HISTORY] User data:", userData);

        return {
          name: userData?.name || userData?.email || 'Admin User',
          email: userData?.email || 'admin@example.com'
        };
      }

    } catch (error) {
      console.error('Error getting user data:', error);

    }
  };

  // Add entry to chip history
  const addToHistory = async (action, chipId, vehicleId, notes, vin = null) => {
    try {
      console.log(`📚 [HISTORY] Adding ${action} entry:`, { chipId, vehicleId, vin });

      const user = getCurrentUser();
      const newEntry = {
        action,
        chip_id: chipId,
        vin: vin,
        timestamp: new Date().toISOString(),
        user_name: user.name,
        user_email: user.email,
        notes
      };

      // Get current history from database
      const { data: currentData, error: fetchError } = await supabase
        .from('cars')
        .select('history')
        .eq('id', vehicleId)
        .single();

      if (fetchError) {
        console.error('📚 [HISTORY] Error fetching current history:', fetchError);
        return;
      }

      // Parse existing history or create new array
      const existingHistory = currentData?.history || { chip_history: [] };
      const historyArray = existingHistory.chip_history || [];

      // Add new entry to the beginning of array (most recent first)
      const updatedHistory = {
        chip_history: [newEntry, ...historyArray]
      };

      // Update database with new history
      const { error: updateError } = await supabase
        .from('cars')
        .update({ history: updatedHistory })
        .eq('id', vehicleId);

      if (updateError) {
        console.error('📚 [HISTORY] Error updating history in database:', updateError);
      } else {
        console.log('📚 [HISTORY] ✅ History updated successfully:', newEntry);
      }
    } catch (error) {
      console.error('📚 [HISTORY] Error adding to history:', error);
    }
  };
  const [validationErrors, setValidationErrors] = useState({});
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const { yardId, yardName, fromScreen } = route?.params || {};
  const duplicateTimeoutRef = useRef(null);
  const slotCheckTimeoutRef = useRef(null);

  // Get yard name - first check dynamic yards, then static yards
  const [currentYard, setCurrentYard] = useState(null);
  const displayYardName = yardName || currentYard?.name || 'Parking Yard';

  // Removed storageKey - now using Supabase directly

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

  // Load current yard information from Supabase
  const loadCurrentYard = async () => {
    try {
      console.log(`🔍 Loading yard info for yardId: ${yardId}`);

      // Get yard information from Supabase facility table
      const { data: facilityData, error } = await supabase
        .from('facility')
        .select('*')
        .eq('id', yardId)
        .single();

      if (error) {
        console.error('❌ Error loading facility from Supabase:', error);
        // Fallback to static data if not found in Supabase
        const staticYard = parkingYards.find(yard => yard?.id === yardId);
        if (staticYard) {
          setCurrentYard(staticYard);
          return staticYard;
        }

        // If still not found, create a default yard
        const defaultYard = { id: yardId, name: 'Unknown Yard', slots: 50 };
        setCurrentYard(defaultYard);
        return defaultYard;
      }

      // Transform Supabase data to match app format
      const yardInfo = {
        id: facilityData.id,
        name: facilityData.name,
        address: facilityData.address,
        slots: facilityData.parkingSlots || 50
      };

      console.log(`✅ Loaded yard from Supabase:`, yardInfo);
      setCurrentYard(yardInfo);
      return yardInfo;
    } catch (error) {
      console.error('❌ Error loading current yard:', error);
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

  // Load vehicles from Supabase for current yard
  const loadVehiclesFromStorage = async () => {
    try {
      setIsLoading(true);
      // First load the current yard information
      const yardData = await loadCurrentYard();

      console.log(`🔍 Loading vehicles for yard: "${displayYardName}"`);
      console.log(`🔍 Yard ID: ${yardId}`);
      console.log(`🔍 Current Yard:`, currentYard);

      // Fetch vehicles from Supabase for this specific facility/yard using facility ID
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('facilityId', yardId);

      if (error) {
        console.error('❌ Error loading vehicles from Supabase:', error);
        Toast.show('Failed to load vehicles', Toast.SHORT);
        setVehicles([]);
        setFilteredVehicles([]);
        setHasBeenInitialized(true);
        return;
      }

      console.log(`✅ Loaded ${data?.length || 0} vehicles from Supabase for facility ID "${yardId}"`);
      console.log(`🔍 Raw data from Supabase:`, data);

      // Transform Supabase data to match app format
      const parsedVehicles = (data || []).map(vehicle => ({
        id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year || 'N/A',
        color: vehicle.color,
        slotNo: vehicle.slotNo,
        chipId: vehicle.chip || null,
        trackerNo: vehicle.trackerNo || null,
        isActive: vehicle.chip ? true : false,
        status: vehicle.status || 'Assigned',
        assignedDate: vehicle.assignedDate,
        lastLocationUpdate: vehicle.last_location_update || null,
      }));

      setVehicles(parsedVehicles);
      setFilteredVehicles(parsedVehicles);
      setHasBeenInitialized(true);

      // Calculate slot information using the loaded yard data
      const slotData = calculateSlotInfo(parsedVehicles, yardData);
      setSlotInfo(slotData);

    } catch (error) {
      console.error('❌ Error loading vehicles:', error);
      Toast.show('Failed to load vehicles', Toast.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed saveVehiclesToStorage - now using Supabase directly

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

  // Removed save to storage useEffect - now using Supabase directly

  // Add new VIN from scanner
  useEffect(() => {
    if (route?.params?.vinNumber) {
      fetchVehicleDetails(route?.params?.vinNumber);
    }
  }, [route?.params?.vinNumber]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (duplicateTimeoutRef.current) {
        clearTimeout(duplicateTimeoutRef.current);
      }
      if (slotCheckTimeoutRef.current) {
        clearTimeout(slotCheckTimeoutRef.current);
      }
    };
  }, []);

  // Check if VIN already exists in any facility (case-insensitive)
  const checkVinExists = async (vin) => {
    try {
      // Check in Supabase using case-insensitive search
      const { data, error } = await supabase
        .from('cars')
        .select('vin, facilityId, make, model')
        .ilike('vin', vin); // Case-insensitive match

      if (error) {
        console.error('❌ Error checking VIN:', error);
        return { exists: false };
      }

      if (data && data.length > 0) {
        const foundVehicle = data[0];

        // facilityId is already the yard name (string), not ID
        const yardName = foundVehicle.facilityId || 'Unknown Facility';

        return {
          exists: true,
          vehicle: foundVehicle,
          yardName: yardName
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('❌ Error checking VIN existence:', error);
      return { exists: false };
    }
  };

  // Check if chip already exists in any facility (case-insensitive)
  const checkChipExists = async (chipId) => {
    try {
      // Check in Supabase using case-insensitive search
      const { data, error } = await supabase
        .from('cars')
        .select('chip, vin, facilityId, make, model')
        .ilike('chip', chipId); // Case-insensitive match

      if (error) {
        console.error('❌ Error checking Chip:', error);
        return { exists: false };
      }

      if (data && data.length > 0) {
        const foundVehicle = data[0];

        // facilityId is already the yard name (string), not ID
        const yardName = foundVehicle.facilityId || 'Unknown Facility';

        return {
          exists: true,
          vehicle: { ...foundVehicle, chipId: foundVehicle.chip },
          yardName: yardName,
          yardId: foundVehicle.facilityId,
          vin: foundVehicle.vin
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('❌ Error checking chip existence:', error);
      return { exists: false };
    }
  };

  // Check if slot number already exists in the same yard
  const checkSlotExists = async (slotNo, facilityId) => {
    try {
      console.log(`🔍 Checking slot ${slotNo} in facility: ${facilityId}`);

      const { data, error } = await supabase
        .from('cars')
        .select('slotNo, vin, facilityId, make, model')
        .eq('facilityId', facilityId)
        .eq('slotNo', slotNo.trim());

      if (error) {
        console.error('❌ Error checking slot:', error);
        return { exists: false };
      }

      if (data && data.length > 0) {
        const foundVehicle = data[0];
        console.log(`❌ Slot ${slotNo} already occupied by VIN: ${foundVehicle.vin}`);

        return {
          exists: true,
          vehicle: foundVehicle,
          slotNo: foundVehicle.slotNo,
          vin: foundVehicle.vin
        };
      }

      console.log(`✅ Slot ${slotNo} is available`);
      return { exists: false };
    } catch (error) {
      console.error('❌ Error checking slot:', error);
      return { exists: false };
    }
  };

  // Real-time slot validation with debouncing
  const handleSlotNumberChange = (text) => {
    setVehicleSlotNo(text);

    // Clear previous timeout
    if (slotCheckTimeoutRef.current) {
      clearTimeout(slotCheckTimeoutRef.current);
    }

    // Clear slot error immediately when user starts typing
    if (validationErrors.slotNo) {
      setValidationErrors(prev => ({ ...prev, slotNo: '' }));
    }

    // If empty, don't check
    if (!text || text.trim().length === 0) {
      return;
    }

    // Set checking state
    setIsCheckingSlot(true);

    // Debounce the slot check (wait 800ms after user stops typing)
    slotCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const slotCheck = await checkSlotExists(text.trim(), yardId);

        if (slotCheck.exists) {
          setValidationErrors(prev => ({
            ...prev,
            slotNo: `Slot ${text.trim()} is already occupied`
          }));
        } else {
          // Clear slot error if slot is available
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.slotNo;
            return newErrors;
          });
        }
      } catch (error) {
        console.error('❌ Error checking slot in real-time:', error);
      } finally {
        setIsCheckingSlot(false);
      }
    }, 800);
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

  // Validation function
  const validateVehicleData = async () => {
    const errors = {};

    if (!scannedVinData?.vin || scannedVinData.vin.length < 3) {
      errors.vin = 'VIN must be at least 3 characters';
    }

    if (!scannedVinData?.make || scannedVinData.make.length < 2) {
      errors.make = 'Make must be at least 2 characters';
    }

    if (!scannedVinData?.model || scannedVinData.model.length < 2) {
      errors.model = 'Model must be at least 2 characters';
    }

    // Color is now optional - only validate if provided
    // if (!vehicleColor || vehicleColor.trim().length < 2) {
    //   errors.color = 'Color must be at least 2 characters';
    // }

    // Slot number is now optional - only validate if provided
    // if (!vehicleSlotNo || vehicleSlotNo.trim().length < 1) {
    //   errors.slotNo = 'Slot number is required';
    // }

    // Check if slot is already occupied (only if slot is provided)
    if (vehicleSlotNo && vehicleSlotNo.trim().length > 0) {
      const slotCheck = await checkSlotExists(vehicleSlotNo.trim(), yardId);
      if (slotCheck.exists) {
        errors.slotNo = `Slot ${vehicleSlotNo} is already occupied by VIN: ${slotCheck.vin}`;
      }
    }

    return errors;
  };

  const handleAssignChip = async () => {
    try {
      // Validate vehicle data first
      const errors = await validateVehicleData();
      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        Toast.show('Please fill all required fields correctly', Toast.LONG);
        return;
      }

      setIsScanningChip(true);

      // Import barcode scanner for chip scanning
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

      const config = {
        license: 't0104HAEAAG7Dm4Jh1NwYjEncE1DwQ3PoLN8IGycyCDZYryphPYFWpnrP1k0QClW8V7xicZuouoY1Tws36ry55YNMpTeLlCEYBgh1s2dNrgO+6MhL9We24VgzO8VE/HYqrs7s7gnTDXGhObw=;t0108HAEAAFPKsrZ27uslPcr2wdyQOHBDc6EGjtH5bSaSp8NEtcRQ9KWp/dI0WLG9Nu0aAf0FsoA6E/18gSqVAQeI1SECiZYdEBPAMMCSm/e1hHb4R0fsN1yfWYfjntkpJuKxU3531ogomD5/QDnK',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        // Extract EUI ID (first 16 characters)
        const chipId = fullText.substring(0, 16);

        console.log('Scanned chip full text:', fullText);
        console.log('Extracted EUI ID:', chipId);

        // Check if chip length is valid (at least 2 chars as per API requirement)
        if (chipId.length < 2) {
          Toast.show('Invalid chip ID', Toast.LONG);
          setIsScanningChip(false);
          return;
        }

        // Check if chip already exists in any facility
        const chipCheck = await checkChipExists(chipId);
        if (chipCheck.exists) {
          // Clear any existing timeout
          if (duplicateTimeoutRef.current) {
            clearTimeout(duplicateTimeoutRef.current);
          }

          // Close VIN modal first
          setShowVinModal(false);
          setScannedVinData(null);
          setVehicleSlotNo('');
          setVehicleColor('');
          setValidationErrors({});
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

        // Prepare vehicle data for Supabase
        const vehicleData = {
          id: Date.now(), // Generate unique timestamp-based ID
          vin: scannedVinData.vin,
          chip: chipId,
          slotNo: vehicleSlotNo.trim() || null, // Optional - can be null
          trackerNo: '', // Optional - empty for now
          facilityId: yardId, // Send facility ID instead of name
          make: scannedVinData.make,
          model: scannedVinData.model,
          color: vehicleColor.trim() || null, // Optional - can be null
          // assigneddate: new Date().toISOString(), // Set assigned date automatically
          assigneddate: (() => {
            const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
            return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')} ${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}:${String(ist.getUTCSeconds()).padStart(2, '0')}.${String(ist.getUTCMilliseconds()).padStart(3, '0')}`;
          })(),
        };

        // Add vehicle to Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('cars')
          .insert([vehicleData])
          .select();

        if (insertError) {
          console.error('❌ Error adding vehicle to Supabase:', insertError);
          Toast.show(`Failed to add vehicle: ${insertError.message}`, Toast.LONG);
          setIsScanningChip(false);
          return;
        }

        console.log('✅ Vehicle added to Supabase successfully:', insertedData);

        // First remove from inactive chips if exists, then add to active
        await removeInactiveChip(chipId);

        // Add to active chips array
        await addActiveChip({
          chipId: chipId,
          vehicleId: insertedData[0].id,
          vin: scannedVinData.vin,
          make: scannedVinData.make,
          model: scannedVinData.model,
          yardId: yardId,
          yardName: displayYardName
        });
        console.log(`✅ Chip ${chipId} added to active chips array`);

        // Add vehicle scan history first
        await addToHistory('vehicle_scanned', null, insertedData[0].id, `Vehicle VIN ${scannedVinData.vin} scanned`, scannedVinData.vin);

        // Add chip assign history
        await addToHistory('assigned', chipId, insertedData[0].id, 'Chip assigned to scanned vehicle');

        // Reload vehicles from Supabase
        await loadVehiclesFromStorage();

        setShowVinModal(false);
        setScannedVinData(null);
        setVehicleSlotNo('');
        setVehicleColor('');
        setValidationErrors({});

        Toast.show('✅ Vehicle added successfully with chip!', Toast.LONG);

        // Navigate back to HomeScreen after successful vehicle addition
        setTimeout(() => {
          navigation.navigate('HomeScreen');
        }, 1000);
      } else {
        Toast.show('Chip scanning cancelled', Toast.SHORT);
      }
    } catch (error) {
      console.error('❌ Error in handleAssignChip:', error);
      Toast.show('Failed to add vehicle. Please try again.', Toast.LONG);
    } finally {
      setIsScanningChip(false);
    }
  };

  const handleCancelVin = async () => {
    // Add vehicle without chip when user cancels
    try {
      if (!scannedVinData) return;

      // Validate vehicle data first
      const errors = await validateVehicleData();
      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        Toast.show('Please fill all required fields correctly', Toast.LONG);
        return;
      }

      setIsLoading(true);

      // Prepare vehicle data for Supabase (without chip)
      const vehicleData = {
        id: Date.now(), // Generate unique timestamp-based ID
        vin: scannedVinData.vin,
        chip: null, // No chip assigned yet
        slotNo: vehicleSlotNo.trim() || null, // Optional - can be null
        trackerNo: '', // Optional - empty for now
        facilityId: yardId, // Send facility ID instead of name
        make: scannedVinData.make,
        model: scannedVinData.model,
        color: vehicleColor.trim() || null, // Optional - can be null
        // assigneddate: new Date().toISOString(), // Set assigned date automatically
        assigneddate: (() => {
          const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
          return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')} ${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}:${String(ist.getUTCSeconds()).padStart(2, '0')}.${String(ist.getUTCMilliseconds()).padStart(3, '0')}`;
        })(),
      };

      // Add vehicle to Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('cars')
        .insert([vehicleData])
        .select();

      if (insertError) {
        console.error('❌ Error adding vehicle to Supabase:', insertError);
        Toast.show(`Failed to add vehicle: ${insertError.message}`, Toast.LONG);
        setIsLoading(false);
        return;
      }

      console.log('✅ Vehicle added to Supabase successfully (without chip):', insertedData);

      // Add vehicle scan history (without chip)
      await addToHistory('vehicle_scanned', null, insertedData[0].id, `Vehicle VIN ${scannedVinData.vin} added without chip`, scannedVinData.vin);

      // Reload vehicles from Supabase
      await loadVehiclesFromStorage();

      setShowVinModal(false);
      setScannedVinData(null);
      setVehicleSlotNo('');
      setVehicleColor('');
      setValidationErrors({});
      setIsLoading(false);

      Toast.show('✅ Vehicle added successfully! You can assign chip later.', Toast.LONG);

      // Navigate back to HomeScreen after successful vehicle addition
      setTimeout(() => {
        navigation.navigate('HomeScreen');
      }, 1000);
    } catch (error) {
      console.error('❌ Error in handleCancelVin:', error);
      Toast.show('Failed to add vehicle. Please try again.', Toast.LONG);
      setIsLoading(false);
    }
  };

  const handleAssignId = async (vehicleId) => {
    try {
      // Import barcode scanner for chip scanning
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

      const config = {
        license: 't0104HAEAAG7Dm4Jh1NwYjEncE1DwQ3PoLN8IGycyCDZYryphPYFWpnrP1k0QClW8V7xicZuouoY1Tws36ry55YNMpTeLlCEYBgh1s2dNrgO+6MhL9We24VgzO8VE/HYqrs7s7gnTDXGhObw=;t0108HAEAAFPKsrZ27uslPcr2wdyQOHBDc6EGjtH5bSaSp8NEtcRQ9KWp/dI0WLG9Nu0aAf0FsoA6E/18gSqVAQeI1SECiZYdEBPAMMCSm/e1hHb4R0fsN1yfWYfjntkpJuKxU3531ogomD5/QDnK',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        // Extract EUI ID (first 16 characters)
        const chipId = fullText.substring(0, 16);

        console.log('Scanned chip full text:', fullText);
        console.log('Extracted EUI ID:', chipId);

        // Check if chip length is valid (at least 2 chars as per API requirement)
        if (chipId.length < 2) {
          Toast.show('Invalid chip ID', Toast.LONG);
          return;
        }

        // Check if chip already exists in any facility
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

        // Find the vehicle being updated
        const vehicleToUpdate = vehicles.find(v => v.id === vehicleId);

        if (!vehicleToUpdate) {
          Toast.show('Vehicle not found', Toast.SHORT);
          return;
        }

        // Update vehicle in Supabase
        const { data: updatedData, error: updateError } = await supabase
          .from('cars')
          .update({ chip: chipId })
          .eq('id', vehicleId)
          .select();

        if (updateError) {
          console.error('❌ Error updating vehicle in Supabase:', updateError);
          Toast.show(`Failed to assign chip: ${updateError.message}`, Toast.LONG);
          return;
        }

        console.log('✅ Vehicle updated in Supabase with chip:', updatedData);

        // First remove from inactive chips if exists, then add to active
        await removeInactiveChip(chipId);

        // Add to active chips array
        await addActiveChip({
          chipId: chipId,
          vehicleId: vehicleToUpdate.id,
          vin: vehicleToUpdate.vin,
          make: vehicleToUpdate.make,
          model: vehicleToUpdate.model,
          yardId: yardId,
          yardName: displayYardName
        });
        console.log(`✅ Chip ${chipId} added to active chips array from existing vehicle`);

        // Reload vehicles from Supabase
        await loadVehiclesFromStorage();

        Toast.show(`✅ Chip ${chipId} assigned successfully!`, Toast.LONG);
      } else {
        Toast.show('Chip scanning cancelled', Toast.SHORT);
      }
    } catch (error) {
      console.error('❌ Error in handleAssignId:', error);
      Toast.show('Failed to assign chip. Please try again.', Toast.LONG);
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
          <Text style={styles.vehicleSpecs}>{item?.model?.charAt(0).toUpperCase() + item?.model?.slice(1)} • {item?.make?.charAt(0).toUpperCase() + item?.make?.slice(1)} </Text>
          {/* Last Location Update Display */}
          {item.isActive && item.chipId && item.lastLocationUpdate && (() => {
            const timestamp = parseDatabaseTimestamp(item.lastLocationUpdate);
            if (!timestamp) return null;
            return (
              <View style={styles.lastUpdateRow}>
                <Ionicons name="time-outline" size={12} color={blackColor} />
                <Text style={styles.lastUpdateText}>
                  Last location: {getTimeAgo(timestamp)}
                </Text>
              </View>
            );
          })()}
        </View>


        {item.isActive && item.chipId ? (
          <View style={styles.chipIdTag}>
            <Text style={styles.chipIdText}>
              <Text>
                {item.chipId.slice(0, -3)}
                <Text style={{ color: whiteColor, fontSize: style.fontSizeMedium.fontSize }}>
                  {item.chipId.slice(-3)}
                </Text>
              </Text>
            </Text>
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
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
        showsVerticalScrollIndicator={false}
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

  // Handle edit yard
  const handleEditYard = () => {
    setEditYardName(currentYard?.name || '');
    setEditYardAddress(currentYard?.address || '');
    setEditYardSlots(currentYard?.slots?.toString() || '50');
    setShowEditYardModal(true);
  };

  // Update yard details
  const handleUpdateYard = async () => {
    try {
      const newSlots = parseInt(editYardSlots);

      // Validate slots against current vehicles
      if (newSlots < vehicles.length) {
        Alert.alert(
          'Cannot Reduce Slots',
          `This yard has ${vehicles.length} vehicles. You cannot reduce slots below ${vehicles.length}.`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('🔄 Updating yard in Supabase...');

      // 1. Update in Supabase first
      const { data, error } = await supabase
        .from('facility')
        .update({
          name: editYardName,
          address: editYardAddress,
          parkingSlots: newSlots,
        })
        .eq('id', yardId)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        Alert.alert('Error', `Failed to update yard: ${error.message}`);
        return;
      }

      console.log('✅ Updated in Supabase:', data);

      // Update current yard state with new data
      const updatedYard = {
        id: yardId,
        name: editYardName,
        address: editYardAddress,
        slots: newSlots
      };
      setCurrentYard(updatedYard);

      // Recalculate slot info
      const slotData = calculateSlotInfo(vehicles, updatedYard);
      setSlotInfo(slotData);

      console.log('✅ Updated yard state');

      setShowEditYardModal(false);
      Toast.show('✅ Yard updated successfully!', Toast.LONG);

    } catch (error) {
      console.error('❌ Error updating yard:', error);
      Alert.alert('Error', `Failed to update yard: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, flexDirectionRow, alignItemsCenter, justifyContentSpaceBetween]}>
        <View style={[flexDirectionRow, alignItemsCenter, { flex: 1 }]}>
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

        {/* Edit Button */}
        <TouchableOpacity
          onPress={handleEditYard}
          style={styles.headerEditButton}>
          <Ionicons name="pencil" size={22} color="#003F65" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, alignJustifyCenter]}>
          <ActivityIndicator size="large" color="#003F65" />
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
        onRequestClose={() => {
          setShowVinModal(false);
          setVehicleSlotNo('');
          setVehicleColor('');
          setValidationErrors({});
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => { }}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Vehicle Details</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowVinModal(false);
                        setVehicleSlotNo('');
                        setVehicleColor('');
                        setValidationErrors({});
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.vinDetailsContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.vinLabel}>VIN Number:</Text>
                    <Text style={styles.vinValue}>{scannedVinData?.vin}</Text>

                    <Text style={styles.vinLabel}>Make:</Text>
                    <Text style={styles.vinValue}>{scannedVinData?.make}</Text>
                    {validationErrors.make && (
                      <Text style={styles.errorText}>{validationErrors.make}</Text>
                    )}

                    <Text style={styles.vinLabel}>Model:</Text>
                    <Text style={styles.vinValue}>{scannedVinData?.model}</Text>
                    {validationErrors.model && (
                      <Text style={styles.errorText}>{validationErrors.model}</Text>
                    )}

                    <Text style={styles.vinLabel}>Year:</Text>
                    <Text style={styles.vinValue}>{scannedVinData?.year}</Text>

                    <Text style={styles.vinLabel}>Color:</Text>
                    <TextInput
                      style={[
                        styles.vinInput,
                        validationErrors.color && styles.inputError
                      ]}
                      placeholder="Enter vehicle color (e.g., Red, Blue) - Optional"
                      placeholderTextColor="#999"
                      value={vehicleColor}
                      onChangeText={(text) => {
                        setVehicleColor(text);
                        if (validationErrors.color) {
                          setValidationErrors(prev => ({ ...prev, color: undefined }));
                        }
                      }}
                      returnKeyType="next"
                    />
                    {validationErrors.color && (
                      <Text style={styles.errorText}>{validationErrors.color}</Text>
                    )}

                    <Text style={styles.vinLabel}>Slot Number:</Text>
                    <View>
                      <TextInput
                        style={[
                          styles.vinInput,
                          validationErrors.slotNo && styles.inputError
                        ]}
                        placeholder="Enter slot number (e.g., A1, B12) - Optional"
                        placeholderTextColor="#999"
                        value={vehicleSlotNo}
                        onChangeText={handleSlotNumberChange}
                        returnKeyType="done"
                        autoCapitalize="characters"
                      />
                      {isCheckingSlot && (
                        <View style={styles.checkingIndicator}>
                          <ActivityIndicator size="small" color="#003F65" />
                          <Text style={styles.checkingText}>Checking availability...</Text>
                        </View>
                      )}
                    </View>
                    {validationErrors.slotNo && (
                      <Text style={styles.errorText}>{validationErrors.slotNo}</Text>
                    )}
                    {!validationErrors.slotNo && !isCheckingSlot && vehicleSlotNo.trim().length > 0 && (
                      <Text style={styles.successText}>✓ Slot is available</Text>
                    )}

                    <View style={{ height: 20 }} />
                  </ScrollView>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelVin}
                    >
                      <Text style={styles.cancelButtonText}>Skip Chip</Text>
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
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Yard Modal */}
      <Modal
        visible={showEditYardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowEditYardModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Pressable style={styles.modalOverlay} onPress={() => { setShowEditYardModal(false); }}>
              <TouchableWithoutFeedback onPress={() => {
                Keyboard.dismiss();
                setShowEditYardModal(false);
              }}>
                <View style={styles.modalContent}>
                  {/* Drag Handle */}
                  <View style={styles.modalHandle} />

                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Parking Yard</Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      setShowEditYardModal(false);
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
                        style={styles.textInput}
                        placeholder="e.g., North Parking Yard"
                        value={editYardName}
                        onChangeText={setEditYardName}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Address *</Text>
                      <TextInput
                        style={[styles.textInput, { height: 60 }]}
                        placeholder="e.g., 123 Main Street, City"
                        value={editYardAddress}
                        onChangeText={setEditYardAddress}
                        multiline
                        numberOfLines={2}
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Number of Parking Slots *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 50"
                        value={editYardSlots}
                        onChangeText={setEditYardSlots}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleUpdateYard();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.submitButtonText}>Update Yard</Text>
                    </TouchableOpacity>

                    {/* Extra space for keyboard */}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </Pressable>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Duplicate Validation Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
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
                    onPress={() => {
                      const chipIdToUnassign = duplicateInfo?.value;
                      Alert.alert(
                        'Unassign Chip',
                        `Are you sure you want to unassign this chip?\n\nChip ID: ${chipIdToUnassign}\nVIN: ${duplicateInfo?.vin}\nYard: ${duplicateInfo?.yardName}\n\nThe vehicle will become inactive.`,
                        [
                          {
                            text: 'No',
                            style: 'cancel',
                          },
                          {
                            text: 'Yes',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                // Update vehicle in Supabase to remove chip
                                const { error: updateError } = await supabase
                                  .from('cars')
                                  .update({ chip: null })
                                  .eq('chip', chipIdToUnassign);

                                if (updateError) {
                                  console.error('❌ Error unassigning chip:', updateError);
                                  Toast.show('Failed to unassign chip', Toast.SHORT);
                                  return;
                                }

                                console.log(`✅ Chip ${chipIdToUnassign} unassigned in Supabase`);

                                // Move chip to inactive array in chip manager
                                await moveChipToInactive(chipIdToUnassign);
                                console.log(`✅ Chip ${chipIdToUnassign} moved to inactive chips`);

                                // Add to history
                                await addToHistory('unassigned', chipIdToUnassign, duplicateInfo?.vehicleId, 'Chip unassigned from duplicate vehicle', duplicateInfo?.vin);

                                // Reload vehicles
                                await loadVehiclesFromStorage();
                                setShowDuplicateModal(false);
                                Toast.show('✅ Chip unassigned successfully', Toast.SHORT);
                              } catch (e) {
                                console.error('❌ Error unassigning chip:', e);
                                Toast.show('Failed to unassign chip', Toast.SHORT);
                              }
                            },
                          },
                        ]
                      );
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
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(1),
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
    fontSize: style.fontSizeSmall.fontSize,
    color: '#003F65',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  fullYardHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullYardHeaderText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#FF6B6B',
    fontWeight: style.fontWeightMedium.fontWeight,
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
    fontSize: style.fontSizeSmall.fontSize,
    color: '#FF6B6B',
    fontWeight: style.fontWeightThin1x.fontWeight,
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
    backgroundColor: '#003F65',
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
    fontWeight: style.fontWeightMedium.fontWeight,
    color: blackColor,
  },
  lastUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  lastUpdateText: {
    fontSize: style.fontSizeExtraSmall.fontSize,
    color: blackColor,
    fontStyle: 'italic',
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
    backgroundColor: '#003F65',
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
    marginBottom: hp(13),
  },
  addMoreButton: {
    backgroundColor: '#003F65',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.large,
    borderRadius: 30,
    shadowColor: '#003F65',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#003F65',
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
    justifyContent: 'flex-end',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacings.large,
    paddingTop: 12,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#DDD',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
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
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
  },
  closeButton: {
    padding: spacings.small,
  },
  vinDetailsContainer: {
    marginBottom: 25,
  },
  vinLabel: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  vinValue: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: spacings.normalx,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#003F65',
  },
  vinInput: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#333',
    backgroundColor: '#fff',
    padding: spacings.large,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 5,
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  errorText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#FF6B6B',
    marginTop: 2,
    marginBottom: 10,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  successText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#4CAF50',
    marginTop: 2,
    marginBottom: 10,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  checkingIndicator: {
    position: 'absolute',
    right: 10,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  checkingText: {
    fontSize: 11,
    color: '#003F65',
    marginLeft: 5,
    fontWeight: style.fontWeightMedium.fontWeight,
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
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  assignChipButton: {
    flex: 1,
    backgroundColor: '#003F65',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#003F65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  assignChipButtonText: {
    color: '#fff',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
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
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  duplicateInfoContainer: {
    padding: 24,
  },
  duplicateMainMessage: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  duplicateYardText: {
    fontSize: 18,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#003F65',
    textAlign: 'center',
    marginBottom: 16,
  },
  duplicateVinText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateChipText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateCloseButton: {
    backgroundColor: '#003F65',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003F65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: style.fontWeightMedium1x.fontWeight,
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
    backgroundColor: '#003F65',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: "center",
    marginHorizontal: 5,
  },
  duplicateActionButtonText: {
    color: '#fff',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    textAlign: "center"
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
    fontWeight: style.fontWeightMedium.fontWeight,
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
  headerEditButton: {
    backgroundColor: '#f3f0ff',
    padding: 10,
    borderRadius: 8,
  },
  formContainer: {
    // marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: style.fontSizeNormal.fontSize,
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
    fontWeight: style.fontWeightBold.fontWeight,
    marginLeft: 10,
  },
});

export default YardDetailScreen;