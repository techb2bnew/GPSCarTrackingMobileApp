import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../lib/supabaseClient';
import LinearGradient from 'react-native-linear-gradient';
import { spacings, style } from '../constants/Fonts';
import {
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
  blackColor,
  lightBlackBackground,
  lightBlackBorder,
} from '../constants/Color';
import { heightPercentageToDP as hp } from '../utils';

export default function AddVehicleScreen({ navigation, route }) {
  const [showYardSelectionModal, setShowYardSelectionModal] = useState(false);
  const [showVehicleExistsModal, setShowVehicleExistsModal] = useState(false);
  const [notFoundData, setNotFoundData] = useState(null);
  const [existingVehicle, setExistingVehicle] = useState(null);
  const [existingYardName, setExistingYardName] = useState('');
  const [yards, setYards] = useState([]);

  const fetchYards = async () => {
    try {
      const { data, error } = await supabase.from('facility').select('*');
      if (error) {
        console.error('Error loading yards:', error);
        return;
      }
      const yardsData = (data || []).map(yard => ({
        id: yard.id,
        name: yard.name,
        address: yard.address,
        slots: yard.parkingSlots || 50,
      }));
      setYards(yardsData);
    } catch (error) {
      console.error('Error loading yards:', error);
    }
  };


  useEffect(() => {
    if (route?.params?.notFoundData) {
      const data = route.params.notFoundData;
      setNotFoundData(data);
      fetchYards().then(() => setShowYardSelectionModal(true));
      navigation.setParams({ notFoundData: null });
    }

    if (route?.params?.vehicleExists) {
      setExistingVehicle(route.params.existingVehicle);
      setExistingYardName(route.params.yardName || 'Unknown Yard');
      setShowVehicleExistsModal(true);
      navigation.setParams({ vehicleExists: null, existingVehicle: null, yardName: null });
    }
  }, [route?.params?.notFoundData, route?.params?.vehicleExists]);

  const onAddVehiclePress = () => {
    navigation.navigate('ScannerScreen', {
      scanType: 'vin',
      isAddingVehicle: true,
      returnTo: 'AddVehicleScreen',
    });
  };

  const onReadVinPress = () => {
    navigation.navigate('TextScanScreen', {
      mode: 'vin',
      autoOpen: true,
      hideResult: true,
      returnTo: 'AddVehicleScreen',
      asAddVehicleFlow: true,
    });
  };

  return (
    <LinearGradient
      colors={[
        gradientSoftTop,
        gradientSoftMid1,
        gradientSoftMid2,
        gradientSoftMid3,
        gradientSoftMid4,
        gradientSoftBottom,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.contentContainer}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Add New Vehicle</Text>
          <Text style={styles.welcomeSubtitle}>
            Add a vehicle by capturing its 17‑character VIN. After capturing the VIN, you’ll select the parking yard.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.addVehicleCard}
            activeOpacity={0.8}
            onPress={onAddVehiclePress}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconContainer, styles.scanIconContainer]}>
                <Ionicons name="scan-outline" size={32} color={blackColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.addVehicleTitle}>Scan VIN</Text>
                <Text style={styles.addVehicleDescription}>
                  Use the barcode scanner to capture VIN instantly.
                </Text>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color={blackColor} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addVehicleCard}
            activeOpacity={0.8}
            onPress={onReadVinPress}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconContainer, styles.readIconContainer]}>
                <Ionicons name="document-text-outline" size={32} color="#2E7D32" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.addVehicleTitle}>Read VIN</Text>
                <Text style={styles.addVehicleDescription}>
                  Use camera or gallery photo and we’ll extract the VIN.
                </Text>
              </View>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#2E7D32" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Yard Selection Modal */}
      <Modal visible={showYardSelectionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Yard</Text>
              <Pressable
                onPress={() => {
                  setShowYardSelectionModal(false);
                  setNotFoundData(null);
                }}
              >
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose a yard to add this VIN to:
            </Text>

            {yards.length > 0 ? (
              <FlatList
                data={yards}
                keyExtractor={item => item.id}
                style={styles.yardsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.yardCard}
                    onPress={() => {
                      setShowYardSelectionModal(false);
                      navigation.navigate('YardDetailScreen', {
                        vinNumber: notFoundData?.scannedValue,
                        yardId: item.id,
                        yardName: item.name,
                        fromScreen: 'AddVehicleScreen',
                      });
                      setNotFoundData(null);
                    }}
                  >
                    <Text style={styles.yardCardName}>{item.name}</Text>
                    <Text style={styles.yardCardAddress}>{item.address}</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyYards}>
                <Ionicons name="business-outline" size={80} color="#ccc" />
                <Text style={styles.emptyYardsText}>No Parking Yards Yet</Text>
                <Text style={styles.emptyYardsSubtext}>
                  Please create a yard first to add vehicles
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Vehicle Already Exists Modal */}
      <Modal visible={showVehicleExistsModal} transparent animationType="slide" onRequestClose={() => setShowVehicleExistsModal(false)}>
        <View style={styles.vehicleExistsModalOverlay}>
          <View style={styles.vehicleExistsModalContent}>
            <Pressable
              onPress={() => {
                setShowVehicleExistsModal(false);
                setExistingVehicle(null);
                setExistingYardName('');
              }}
              style={styles.vehicleExistsCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>

            <View style={styles.vehicleExistsIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#FFA500" />
            </View>

            <Text style={styles.vehicleExistsTitle}>Vehicle Already Exists</Text>

            <View style={styles.vehicleExistsContent}>
              <Text style={styles.vehicleExistsText}>
                This VIN number is already registered in the system.
              </Text>

              {existingVehicle && (
                <View style={styles.vehicleExistsDetails}>
                  <View style={styles.vehicleExistsDetailRow}>
                    <Ionicons name="information-circle" size={20} color={blackColor} />
                    <View style={styles.vehicleExistsDetailTextContainer}>
                      <Text style={styles.vehicleExistsDetailLabel}>VIN Number</Text>
                      <Text style={styles.vehicleExistsDetailValue}>{existingVehicle.vin}</Text>
                    </View>
                  </View>

                  {existingVehicle.make && (
                    <View style={styles.vehicleExistsDetailRow}>
                      <Ionicons name="car" size={20} color={blackColor} />
                      <View style={styles.vehicleExistsDetailTextContainer}>
                        <Text style={styles.vehicleExistsDetailLabel}>Make</Text>
                        <Text style={styles.vehicleExistsDetailValue}>{existingVehicle.make}</Text>
                      </View>
                    </View>
                  )}

                  {existingVehicle.model && (
                    <View style={styles.vehicleExistsDetailRow}>
                      <Ionicons name="calendar" size={20} color={blackColor} />
                      <View style={styles.vehicleExistsDetailTextContainer}>
                        <Text style={styles.vehicleExistsDetailLabel}>Model</Text>
                        <Text style={styles.vehicleExistsDetailValue}>{existingVehicle.model}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.vehicleExistsDetailRow}>
                    <Ionicons name="business" size={20} color={blackColor} />
                    <View style={styles.vehicleExistsDetailTextContainer}>
                      <Text style={styles.vehicleExistsDetailLabel}>Parking Yard</Text>
                      <Text style={styles.vehicleExistsDetailValue}>{existingYardName}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <Pressable
              style={styles.vehicleExistsCloseButtonMain}
              onPress={() => {
                setShowVehicleExistsModal(false);
                setExistingVehicle(null);
                setExistingYardName('');
              }}
            >
              <Text style={styles.vehicleExistsCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacings.Large1x,
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(2),
  },
  welcomeSection: {
    marginBottom: hp(2.8),
    alignItems: 'center',
    paddingHorizontal: spacings.medium,
  },
  welcomeTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#252837',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#646E77',
    textAlign: 'center',
    paddingHorizontal: spacings.large,
    lineHeight: 20,
    marginTop: spacings.xxsmall,
  },
  buttonsContainer: {
    width: '100%',
    gap: spacings.large,
    paddingBottom: hp(8),
  },
  addVehicleCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'visible',
    minHeight: hp(13),
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: lightBlackBorder,
    marginBottom: 0,
  },
  scanIconContainer: {
    backgroundColor: lightBlackBackground,
    borderWidth: 1,
    borderColor: lightBlackBorder,
  },
  readIconContainer: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.22)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacings.Large1x,
  },
  iconContainer: {
    width: hp(9),
    height: hp(9),
    borderRadius: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacings.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  addVehicleTitle: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#252837',
    marginBottom: spacings.xxsmall,
  },
  addVehicleDescription: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#646E77',
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: spacings.medium,
    padding: spacings.xsmall,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacings.Large1x,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: 'black',
  },
  modalSubtitle: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  yardsList: {
    maxHeight: 400,
  },
  yardCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    padding: spacings.large,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  yardCardName: {
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: style.fontSizeMedium.fontSize,
    color: '#252837',
    marginBottom: 4,
  },
  yardCardAddress: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#252837',
  },
  emptyYards: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyYardsText: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyYardsSubtext: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Vehicle Exists Modal Styles
  vehicleExistsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleExistsModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: spacings.Large1x + 10,
    width: '88%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  vehicleExistsCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 10,
  },
  vehicleExistsIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  vehicleExistsTitle: {
    fontSize: style.fontSizeLargeX.fontSize,
    color: '#252837',
    fontWeight: style.fontWeightBold.fontWeight,
    textAlign: 'center',
    marginBottom: 15,
  },
  vehicleExistsContent: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
    width: '100%',
  },
  vehicleExistsText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  vehicleExistsDetails: {
    width: '100%',
    marginTop: 10,
  },
  vehicleExistsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  vehicleExistsDetailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleExistsDetailLabel: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    marginBottom: 4,
  },
  vehicleExistsDetailValue: {
    fontSize: style.fontSizeNormal.fontSize,
    color: 'black',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  vehicleExistsCloseButtonMain: {
    backgroundColor: blackColor,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  vehicleExistsCloseButtonText: {
    color: 'white',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },
});
