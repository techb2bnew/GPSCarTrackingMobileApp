import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { blackColor, whiteColor } from '../constants/Color';
import Toast from 'react-native-simple-toast';
import {
  BarcodeScanner,
  EnumScanningMode,
  EnumResultStatus,
} from 'dynamsoft-capture-vision-react-native';
import { useFocusEffect } from '@react-navigation/native';

const LICENSE = 't0105HAEAADcNHV64OJlipcqCx3exOR+gSUqL7YqPqsz7SETM98L2Lvx6wS622L8kpqIvn+Jy7Y7dR1SpS4fQIOlJgnXwUlXbAF3cfFzzoBne6J2Tas81yMvxzdMpCv+dSl9nXy279wYdTDrk;t0109HAEAAJRt4MPEuaQhDlCa6yhda0j07Z/FYbFCd65Ty9mXDgoozD8MgTXwcxZlT+cz8Keo0zcHr2z3xne26lirx+S2TPkgLgCnAYbYvK+paIY7esaO4fu5Bfl3PHN1isx7p/zpHJvJbPQNKuw68w=='
const ScannerScreen = ({ navigation, route }) => {
  const returnTo = route?.params?.returnTo;
  const yardId = route?.params?.yardId;

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
          
          if (returnTo === 'YardDetailScreen') {
            navigation.navigate('YardDetailScreen', { 
              vinNumber: vin,
              yardId: yardId,
              yardName: route?.params?.yardName,
              existingVehicles: route?.params?.existingVehicles || [] // Pass existing vehicles
            });
          } else {
            navigation.navigate('YardDetailScreen', { vinNumber: vin });
          }
        } else {
          Toast.show('Please scan a valid VIN number.');
          navigation.goBack();
        }
      } else if (result.resultStatus === EnumResultStatus.RS_CANCELED) {
        console.log("Scanner closed by user");
      } 
      else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error', error.message || 'Unexpected error occurred');
      Toast.show(error.message || 'Unexpected error occurred');
      navigation.goBack();
    }
  }, [navigation, returnTo, yardId]);

  useFocusEffect(
    useCallback(() => {
      scanVinCode();
    }, [scanVinCode])
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
      {/* No UI needed since scanner opens immediately */}
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
});
