import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { blackColor, whiteColor } from '../constants/Color';
import Toast from 'react-native-simple-toast';
import {
  BarcodeScanner,
  EnumScanningMode,
  EnumResultStatus,
} from 'dynamsoft-capture-vision-react-native';
import { useFocusEffect } from '@react-navigation/native';
import AnimatedLottieView from 'lottie-react-native';
import { widthPercentageToDP as wp } from '../utils';
import { supabase } from '../lib/supabaseClient';

const LICENSE = 't0105HAEAADcNHV64OJlipcqCx3exOR+gSUqL7YqPqsz7SETM98L2Lvx6wS622L8kpqIvn+Jy7Y7dR1SpS4fQIOlJgnXwUlXbAF3cfFzzoBne6J2Tas81yMvxzdMpCv+dSl9nXy279wYdTDrk;t0109HAEAAJRt4MPEuaQhDlCa6yhda0j07Z/FYbFCd65Ty9mXDgoozD8MgTXwcxZlT+cz8Keo0zcHr2z3xne26lirx+S2TPkgLgCnAYbYvK+paIY7esaO4fu5Bfl3PHN1isx7p/zpHJvJbPQNKuw68w=='
const ScannerScreen = ({ navigation, route }) => {
  const returnTo = route?.params?.returnTo;
  const yardId = route?.params?.yardId;
  const scanType = route?.params?.scanType; // 'vin' or 'chip'
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Function to get yard name from facility ID
  const getYardNameFromId = async (facilityId) => {
    try {
      if (!facilityId || facilityId === 'Unknown') return 'Unknown Yard';
      
      // Get yard name from facility table
      const { data: facilityData, error } = await supabase
        .from('facility')
        .select('name')
        .eq('id', facilityId)
        .single();

      if (error || !facilityData) {
        console.log(`⚠️ Yard name not found for ID: ${facilityId}`);
        return `Yard ${facilityId}`; // Fallback with ID
      }

      return facilityData.name;
    } catch (error) {
      console.error('❌ Error fetching yard name:', error);
      return `Yard ${facilityId}`; // Fallback with ID
    }
  };

  // Find vehicle in all yards by VIN (Supabase)
  const findVehicleByVin = async (vin) => {
    try {
      console.log(`🔍 Searching for VIN: ${vin} in Supabase...`);
      
      // Search in Supabase using case-insensitive search
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .ilike('vin', vin);

      if (error) {
        console.error('❌ Error searching VIN in Supabase:', error);
        return null;
      }

      if (data && data.length > 0) {
        const foundVehicle = data[0];
        console.log('✅ Found vehicle in Supabase:', foundVehicle);
        
        // Get yard name from facility ID
        const yardName = await getYardNameFromId(foundVehicle.facilityId);

        // Transform to match app format
        const vehicleWithYardId = {
          id: foundVehicle.id,
          vin: foundVehicle.vin,
          chipId: foundVehicle.chip,
          chip: foundVehicle.chip,
          make: foundVehicle.make,
          model: foundVehicle.model,
          color: foundVehicle.color,
          slotNo: foundVehicle.slotNo,
          facilityId: foundVehicle.facilityId,
          isActive: foundVehicle.chip ? true : false,
        };

        return { 
          vehicle: vehicleWithYardId, 
          yardId: foundVehicle.facilityId, // Send ID to backend
          yardName: yardName // Show name in UI
        };
      }

      console.log('❌ VIN not found in Supabase');
      return null;
    } catch (error) {
      console.error('❌ Error finding vehicle by VIN:', error);
      return null;
    }
  };

  // Find vehicle in all yards by Chip ID (Supabase)
  const findVehicleByChipId = async (chipId) => {
    try {
      console.log(`🔍 Searching for Chip: ${chipId} in Supabase...`);
      
      // Search in Supabase using case-insensitive search
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .ilike('chip', chipId)
        .not('chip', 'is', null);

      if (error) {
        console.error('❌ Error searching Chip in Supabase:', error);
        return null;
      }

      if (data && data.length > 0) {
        const foundVehicle = data[0];
        console.log('✅ Found vehicle with chip in Supabase:', foundVehicle);
        
        // Get yard name from facility ID
        const yardName = await getYardNameFromId(foundVehicle.facilityId);

        // Transform to match app format
        const vehicleWithYardId = {
          id: foundVehicle.id,
          vin: foundVehicle.vin,
          chipId: foundVehicle.chip,
          chip: foundVehicle.chip,
          make: foundVehicle.make,
          model: foundVehicle.model,
          color: foundVehicle.color,
          slotNo: foundVehicle.slotNo,
          facilityId: foundVehicle.facilityId,
          isActive: true, // Has chip, so active
        };

        return { 
          vehicle: vehicleWithYardId, 
          yardId: foundVehicle.facilityId, // Send ID to backend
          yardName: yardName // Show name in UI
        };
      }

      console.log('❌ Chip not found in Supabase');
      return null;
    } catch (error) {
      console.error('❌ Error finding vehicle by chip:', error);
      return null;
    }
  };

  const scanVinCode = useCallback(async () => {
    const config = {
      license: LICENSE,
      scanningMode: EnumScanningMode.SM_SINGLE,
    };

    try {
      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        let fullValue = result.barcodes[0].text || '';
        fullValue = fullValue.toUpperCase().replace(/[IOQ]/g, '');
        const vin = fullValue.substring(0, 17);

        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

        if (vin && vinRegex.test(vin)) {
          console.log("vin::", vin);
          
          // If coming from YardDetailScreen (add vehicle flow)
          if (returnTo === 'YardDetailScreen') {
            navigation.navigate('YardDetailScreen', { 
              vinNumber: vin,
              yardId: yardId,
              yardName: route?.params?.yardName,
              existingVehicles: route?.params?.existingVehicles || [],
              fromScreen: 'ScannerScreen'
            });
          } 
          // If coming from ScanScreen (search flow)
          else if (scanType === 'vin') {
            const found = await findVehicleByVin(vin);
            
            if (found) {
              // Show success animation then navigate back to ScanScreen with data
              setShowSuccessModal(true);
              
              // After 2 seconds, navigate back to ScanScreen with vehicle data
              setTimeout(() => {
                setShowSuccessModal(false);
                navigation.navigate('ScanScreen', {
                  foundVehicle: found.vehicle,
                  foundYardName: found.yardName
                });
              }, 2000);
            } else {
              // Navigate back to ScanScreen with not found data
              navigation.navigate('ScanScreen', {
                notFoundData: {
                  type: 'vin',
                  scannedValue: vin
                }
              });
            }
          } else {
            navigation.navigate('YardDetailScreen', { vinNumber: vin });
          }
        } else {
          Toast.show('Please scan a valid VIN number.');
          navigation.goBack();
        }
      } else if (result.resultStatus === EnumResultStatus.RS_CANCELED) {
        console.log("Scanner closed by user");
        navigation.goBack();
      } 
      else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error', error.message || 'Unexpected error occurred');
      Toast.show(error.message || 'Unexpected error occurred');
      navigation.goBack();
    }
  }, [navigation, returnTo, yardId, scanType]);

  // Scan Chip Code
  const scanChipCode = useCallback(async () => {
    const config = {
      license: LICENSE,
      scanningMode: EnumScanningMode.SM_SINGLE,
    };

    try {
      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        const chipId = fullText.substring(0, 16); // Extract EUI ID
        
        console.log('Scanned Chip ID:', chipId);
        
        const found = await findVehicleByChipId(chipId);
        
        if (found) {
          // Show success animation then navigate back to ScanScreen with data
          setShowSuccessModal(true);
          
          // After 2 seconds, navigate back to ScanScreen with vehicle data
          setTimeout(() => {
            setShowSuccessModal(false);
            navigation.navigate('ScanScreen', {
              foundVehicle: found.vehicle,
              foundYardName: found.yardName
            });
          }, 2000);
        } else {
          // Navigate back to ScanScreen with not found data
          navigation.navigate('ScanScreen', {
            notFoundData: {
              type: 'chip',
              scannedValue: chipId
            }
          });
        }
      } else if (result.resultStatus === EnumResultStatus.RS_CANCELED) {
        console.log("Scanner closed by user");
        navigation.goBack();
      } 
      else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error', error.message || 'Unexpected error occurred');
      Toast.show(error.message || 'Unexpected error occurred');
      navigation.goBack();
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (scanType === 'chip') {
        scanChipCode();
      } else {
        scanVinCode();
      }
    }, [scanVinCode, scanChipCode, scanType])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={30} color={blackColor} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Vehicle</Text>
      </View>
      
      {/* Success Animation Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AnimatedLottieView
              source={require('../assets/successfully.json')}
              autoPlay
              loop={false}
              style={{width: 200, height: 200}}
            />
            <Text style={styles.successText}>Vehicle Found!</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ScannerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: whiteColor },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-between',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: blackColor },
  
  // Success Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: whiteColor,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: wp(80),
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 10,
  },
});
