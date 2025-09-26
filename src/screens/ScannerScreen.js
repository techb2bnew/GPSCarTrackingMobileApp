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

const LICENSE = 't0089pwAAAGhb81iy7n5fl95LSpqqKYmFugxYb0CdzMZSNU22/mifpi6+do3D7oDcPtvfKt5TnmZxUxv9ZEHD476NGNgnZTG+1SWdYDw32dfGX1uxWtzrDUzTImI=;t0089pwAAAG4Nl1WMs7tSfwa4ErLs53Q+2R4dtEegG/i+cOFIrIqT8kXC4oEApNuywNlIJxkkno4ihaS7T4H9WZnZVmh6xss78EWXHmo+G7W18VepotVdT2W/Iow=;t0090pwAAADFvwlIFpw76wSOpv0jkRjunEM+/LF2/TFlVUWufoEax0td4TOlV/jIkmkaCQI13hko7TAXn//xXxz5h94I8BoTs8K1OpQeMZ5dtbvy1FrUSYSdq9yKV';

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
