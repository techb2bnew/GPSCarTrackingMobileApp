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
} from 'react-native';
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
  const [hasBeenInitialized, setHasBeenInitialized] = useState(false);
  const { yardId, yardName } = route?.params || {};

  // Get yard name from parkingYards
  const currentYard = parkingYards.find(yard => yard?.id === yardId);
  const displayYardName = yardName || currentYard?.name || 'Parking Yard';

  // Initialize existing vehicles on first load
  useEffect(() => {
    if (!hasBeenInitialized && route?.params?.existingVehicles) {
      setVehicles(route?.params?.existingVehicles);
      setHasBeenInitialized(true);
    }
  }, [route?.params?.existingVehicles, hasBeenInitialized]);

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
        };

        setVehicles(prevVehicles => [...prevVehicles, newVehicle]);
      } else {
        Alert.alert('Error', 'No vehicle details found for this VIN');
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

  const handleAssignId = (vehicleId) => {
    Alert.alert('Assign Chip', `Assign chip to vehicle ID: ${vehicleId}`);
  };

  const renderVehicleCard = ({ item }) => (
    <View style={styles.vehicleCard}>
      <View style={[flexDirectionRow, alignItemsCenter, justifyContentSpaceBetween]}>
        <View style={styles.vehicleTitleContainer}>
          <Text style={styles.vinNumber}>{item?.vin}</Text>
          <Text style={styles.vehicleSpecs}>{item?.year} • {item?.make} {item?.model}</Text>
        </View>


        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => handleAssignId(item?.id)}
        >
          <Text style={styles.assignButtonText}>Assign Chip</Text>
        </TouchableOpacity>

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

  const renderVehicleList = () => (
    <ScrollView style={styles.scrollContainer}>
      <View style={[styles.headerWithButton, justifyContentSpaceBetween, flexDirectionRow, alignItemsCenter]}>
        <View style={styles.titleSection}>
          <Text style={styles.yardTitle}>{displayYardName}</Text>
          <Text style={styles.vehiclesCount}>{vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'} in this yard</Text>
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

      <FlatList
        data={vehicles}
        keyExtractor={item => item.id}
        renderItem={renderVehicleCard}
        style={styles.vehicleList}
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
    fontSize: style.fontSizeNormal.fontSize,
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
});

export default YardDetailScreen;