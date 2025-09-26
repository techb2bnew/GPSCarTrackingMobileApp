import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-simple-toast';
import {
  BarcodeScanner,
  EnumScanningMode,
  EnumResultStatus,
} from 'dynamsoft-capture-vision-react-native';
import {useFocusEffect} from '@react-navigation/native';

const LICENSE =
  't0090pwAAAI0r6gfXKf9/+1TlyOKvHltxIY6HUawAuEtYEDq119CjLopiCMKT7ZIsOU1vyyb3p8cuk9ynAHwr2qe25A3apbTyJ3qgu2M+V7lOxx8XNXJgfQEddSGn;t0090pwAAAKduXas5JYobS9eKUQVc7caTs3tdhjwNBwJi8vSC6Z2zYsYre0GmxyhLKicUzr9faUZzaJ3BrUqAA+cacKOIPE6eg7/o0kPN40Z1/firohlrtBM0/SHP;t0090pwAAAHaJvcuecK43iD9z0yXOSP+ck6EUbk5bPmpZTLNJairUu8qTd4f8n76oS88ni7lkqUD4nDmma7O494c03GJqg22j3+iCPhuzXKWsjT8K1dV6PQEuyiHG';

const ScannerScreen = ({navigation, route}) => {
  // const fromScreen = route?.params?.from;

  useFocusEffect(
    useCallback(() => {
      scanVinCode();
    }, []),
  );
  // useEffect(() => {
  //   scanVinCode()
  // }, [])

  const scanVinCode = async () => {
    const config = {
      license: LICENSE,
      scanningMode: EnumScanningMode.SM_SINGLE,
    };

    try {
      const result = await BarcodeScanner.launch(config);
       console.log("resultresult",result);
      if (
        result.resultStatus === EnumResultStatus.RS_FINISHED &&
        result.barcodes?.length
      ) {
        let fullValue = result.barcodes[0].text || '';
        fullValue = fullValue.toUpperCase().replace(/[IOQ]/g, '');
        const vin = fullValue.substring(0, 17);

        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

        if (vin && vinRegex.test(vin)) {
          // if (fromScreen === 'VinList') {
          //   // navigation.navigate('VinListScreen', { vinNumber: vin });
          // } else {
          //   // navigation.navigate('WorkOrderScreenTwo', { vinNumber: vin, isFromScanner: true });
          // }
        } else {
          Toast.show('Please scan a valid VIN number.');
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('Error', error.message || 'Unexpected error occurred');
      Toast.show(error.message || 'Unexpected error occurred');
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={30} color={'#000'} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Vehicle</Text>
      </View>
    </View>
  );
};

export default ScannerScreen;

const styles = StyleSheet.create({
  container: {flex: 1, marginTop: 60, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-between',
  },
  backButton: {padding: 5},
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: '#000'},
});
