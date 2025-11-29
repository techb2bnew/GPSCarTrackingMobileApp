import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, FlatList, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { widthPercentageToDP, heightPercentageToDP as hp } from '../utils';
import AnimatedLottieView from 'lottie-react-native';
import BleTesting from '../components/BleTesting';
import { supabase } from '../lib/supabaseClient';
import { spacings, style } from '../constants/Fonts';
import { checkChipOnlineStatus } from '../utils/chipStatusAPI';
import Header from '../components/Header';

export default function ScanScreen({ navigation, route }) {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showYardSelectionModal, setShowYardSelectionModal] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState(null);
  const [foundYardName, setFoundYardName] = useState('');
  const [notFoundData, setNotFoundData] = useState(null);
  const [yards, setYards] = useState([]);
  const [actualYardName, setActualYardName] = useState('');

  // Fetch yards data from Supabase
  const fetchYards = async () => {
    try {
      console.log('🔍 Fetching yards from Supabase...');

      const { data, error } = await supabase
        .from('facility')
        .select('*');

      if (error) {
        console.error('❌ Error loading yards from Supabase:', error);
        return;
      }

      // Transform to match app format
      const yardsData = data.map(yard => ({
        id: yard.id,
        name: yard.name,
        address: yard.address,
        slots: yard.parkingSlots || 50
      }));

      setYards(yardsData);
      console.log(`✅ Loaded ${yardsData.length} yards from Supabase`);
    } catch (error) {
      console.error('❌ Error loading yards:', error);
    }
  };

  // Get actual yard name from yardId (Supabase)
  const getActualYardName = async (yardId) => {
    try {
      console.log(`🔍 Getting yard name for ID: ${yardId}`);

      const { data, error } = await supabase
        .from('facility')
        .select('name')
        .eq('id', yardId)
        .single();

      if (error || !data) {
        console.error('❌ Error getting yard name:', error);
        return `Yard ${yardId}`;
      }

      return data.name || `Yard ${yardId}`;
    } catch (error) {
      console.error('❌ Error getting yard name:', error);
      return `Yard ${yardId}`;
    }
  };

  // Check if we're returning from ScannerScreen with vehicle data
  React.useEffect(() => {
    if (route?.params?.foundVehicle && route?.params?.foundYardName) {
      console.log('route.params.foundVehicle>>', route.params.foundVehicle);
      console.log('route.params.foundYardName>>', route.params.foundYardName);

      const vehicle = route.params.foundVehicle;
      setFoundVehicle(vehicle);
      setFoundYardName(route.params.foundYardName);
      
      // Check chip online status from API if chipId exists
      const checkChipStatus = async () => {
        if (vehicle?.chipId) {
          try {
            console.log(`🔄 Checking online status for chip: ${vehicle.chipId}`);
            const statusMap = await checkChipOnlineStatus([vehicle.chipId]);
            const chipStatus = statusMap[vehicle.chipId];
            
            if (chipStatus) {
              const isActive = chipStatus.online_status === 1;
              console.log(`✅ Chip ${vehicle.chipId} status: ${isActive ? 'Active' : 'Inactive'}`);
              
              // Update vehicle with actual status from API
              setFoundVehicle({
                ...vehicle,
                isActive: isActive,
                onlineStatus: chipStatus.online_status
              });
            } else {
              console.log(`⚠️ No status returned for chip ${vehicle.chipId}`);
            }
          } catch (error) {
            console.error('❌ Error checking chip status:', error);
            // Keep existing isActive value if API fails
          }
        }
      };

      checkChipStatus();
      setShowDetailModal(true);

      // Get actual yard name from yardId
      if (route.params.foundVehicle?.yardId) {
        getActualYardName(route.params.foundVehicle.yardId).then(name => {
          setActualYardName(name);
        });
      }

      // Clear the params so the modal doesn't show again
      navigation.setParams({ foundVehicle: null, foundYardName: null });
    }

    // Check if we're returning from ScannerScreen with not found data
    if (route?.params?.notFoundData) {
      const notFound = route.params.notFoundData;
      setNotFoundData(notFound);
      
      // If isAddingVehicle flag is true, skip popup and directly show yard selection
      if (notFound?.isAddingVehicle) {
        fetchYards().then(() => {
          setShowYardSelectionModal(true);
        });
        setShowNotFoundModal(false);
      } else {
        setShowNotFoundModal(true);
      }
      
      // Clear the params so the modal doesn't show again
      navigation.setParams({ notFoundData: null });
    }
  }, [route?.params]);

  const handleOpen = () => {
    setShowModal(true);

    setTimeout(() => {
      navigation.navigate('ValidIDScreen');
      setShowModal(false);
    }, 2000);
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <Header title="Scan Options" backArrow={false} showSearch={false} /> */}

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <View style={styles.titleWrapper}>
            <Text style={styles.welcomeTitle}>Scan & Search</Text>
          </View>
          <Text style={styles.welcomeSubtitle}>
            Add new vehicle or search existing vehicles by scanning VIN or tracker chip
          </Text>
        </View>

        {/* Buttons Container */}
        <View style={styles.buttonsContainer}>
          {/* Add Vehicle Card */}
          <TouchableOpacity
            style={styles.addVehicleCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ScannerScreen', { scanType: 'vin', isAddingVehicle: true })}
          >
            <View style={styles.cardInner}>
              {/* Icon Container */}
              <View style={[styles.iconContainer, styles.addVehicleIconContainer]}>
                <Ionicons
                  name="add-circle"
                  size={32}
                  color="#613EEA"
                  style={styles.cardIcon}
                />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.addVehicleTitle}>Add New Vehicle</Text>
                <Text style={styles.addVehicleDescription}>
                  Scan VIN to add new vehicle. Select yard after scanning.
                </Text>
              </View>

              {/* Arrow Icon */}
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#613EEA" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Search Options</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* VIN Scan Card */}
          <TouchableOpacity
            style={styles.scanCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ScannerScreen', { scanType: 'vin' })}
          >
            <View style={styles.cardInner}>
              {/* Icon Container */}
              <View style={[styles.iconContainer, styles.vinIconContainer]}>
                <Ionicons
                  name="car-sport"
                  size={30}
                  color="#613EEA"
                  style={styles.cardIcon}
                />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Search by VIN Scan</Text>
                <Text style={styles.cardDescription}>
                  Scan VIN to search and view vehicle details
                </Text>
              </View>

              {/* Arrow Icon */}
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#613EEA" />
              </View>
            </View>

            {/* Decorative Background */}
            {/* <View style={[styles.cardBackground, styles.vinCardBackground]} /> */}
          </TouchableOpacity>

          {/* Chip Scan Card */}
          <TouchableOpacity
            style={styles.scanCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ScannerScreen', { scanType: 'chip' })}
          >
            <View style={styles.cardInner}>
              {/* Icon Container */}
              <View style={[styles.iconContainer, styles.chipIconContainer]}>
                <Ionicons
                  name="hardware-chip"
                  size={30}
                  color="#28a745"
                  style={styles.cardIcon}
                />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Search by Chip Scan</Text>
                <Text style={styles.cardDescription}>
                  Scan tracker chip to search and view vehicle details
                </Text>
              </View>

              {/* Arrow Icon */}
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#28a745" />
              </View>
            </View>

            {/* Decorative Background */}
            {/* <View style={[styles.cardBackground, styles.chipCardBackground]} /> */}
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Search Button */}
      <TouchableOpacity
        style={styles.floatingSearchButton}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("SearchScreen")}
      >
        <Ionicons name="search" size={26} color="white" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <>
              <AnimatedLottieView
                source={require('../assets/scan.json')}
                autoPlay
                loop
                style={{ width: 180, height: 300 }}
              />
            </>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Vehicle Details</Text>
              <Pressable onPress={() => {
                setShowDetailModal(false);
                // Clear the vehicle data so it doesn't show again
                setFoundVehicle(null);
                setFoundYardName('');
              }}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Ionicons name="information-circle" size={24} color="#613EEA" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>VIN Number</Text>
                  <Text style={styles.detailValue}>{foundVehicle?.vin}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="car" size={24} color="#613EEA" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Make </Text>
                  <Text style={styles.detailValue}>{foundVehicle?.make} </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={24} color="#613EEA" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Model</Text>
                  <Text style={styles.detailValue}>{foundVehicle?.model}</Text>
                </View>
              </View>

              {foundVehicle?.chipId && (
                <View style={styles.detailRow}>
                  <Ionicons name="hardware-chip" size={24} color="#28a745" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Chip ID</Text>
                    <Text style={[styles.detailValue, { color: '#28a745' }]}>{foundVehicle?.chipId}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons name="business" size={24} color="#613EEA" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Parking Yard</Text>
                  <Text style={styles.detailValue}>{foundYardName}</Text>
                </View>
              </View>

              {foundVehicle?.chipId && (
                <View style={styles.detailRow}>
                  <Ionicons 
                    name={foundVehicle?.isActive ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={foundVehicle?.isActive ? "#28a745" : "#F24369"} 
                  />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[
                      styles.detailValue, 
                      { color: foundVehicle?.isActive ? '#28a745' : '#F24369' }
                    ]}>
                      {foundVehicle?.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.closeButtonSecondary]}
                onPress={() => {
                  setShowDetailModal(false);
                  // Clear the vehicle data so it doesn't show again
                  setFoundVehicle(null);
                  setFoundYardName('');
                }}>
                <Text style={styles.closeButtonSecondaryText}>Close</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.viewDetailsButton]}
                onPress={() => {
                  setShowDetailModal(false);
                  // Navigate to Vehicle Details Screen
                  navigation.navigate('VehicleDetailsScreen', {
                    vehicle: foundVehicle,
                    yardName: foundYardName,
                    yardId: foundVehicle?.yardId || foundVehicle?.facilityId,
                  });
                  // Clear the vehicle data
                  setFoundVehicle(null);
                  setFoundYardName('');
                }}>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Not Found Modal */}
      <Modal visible={showNotFoundModal} transparent animationType="slide">
        <View style={styles.notFoundModalOverlay}>
          <View style={styles.notFoundModalContent}>
            <View style={styles.notFoundModalHeader}>
              <Text style={styles.notFoundQuestion}>
                {notFoundData?.isNotAssigned
                  ? 'This tracker chip is not assigned to any vehicle.'
                  : notFoundData?.type === 'vin'
                  ? 'This VIN number is not found in any parking yard.'
                  : 'This tracker chip is not found in any parking yard.'
                }
              </Text>

            </View>

            <View style={styles.notFoundContent}>
              <Text style={styles.notFoundText}>
                {notFoundData?.isNotAssigned
                  ? 'Please assign this chip to a vehicle first.'
                  : 'Would you like to add it to a yard?'
                }
              </Text>
            </View>
            <Pressable onPress={() => {
              setShowNotFoundModal(false);
              setNotFoundData(null);
            }} style={{ position: 'absolute', top: 10, right: 10 }}>
              <Ionicons name="close" size={28} color="#666" />
            </Pressable>
            <View style={[styles.notFoundButtons, notFoundData?.isNotAssigned && styles.singleButtonContainer]}>
              <Pressable
                style={[styles.notFoundButton, styles.noButton, notFoundData?.isNotAssigned && styles.singleButton]}
                onPress={() => {
                  setShowNotFoundModal(false);
                  setNotFoundData(null);
                }}>
                <Text style={styles.noButtonText}>
                  {notFoundData?.isNotAssigned ? 'Close' : 'No'}
                </Text>
              </Pressable>

              {!notFoundData?.isNotAssigned && (
                <Pressable
                  style={[styles.notFoundButton, styles.yesButton]}
                  onPress={async () => {
                    setShowNotFoundModal(false);
                    await fetchYards(); // Fetch yards data
                    setShowYardSelectionModal(true); // Show yard selection modal
                  }}>
                  <Text style={styles.yesButtonText}>Yes</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Yard Selection Modal */}
      <Modal visible={showYardSelectionModal} transparent animationType="slide">
        <View style={styles.yardSelectionModalOverlay}>
          <View style={styles.yardSelectionModalContent}>
            <View style={styles.yardSelectionModalHeader}>
              <Text style={styles.yardSelectionModalTitle}>Select Yard</Text>
              <Pressable onPress={() => {
                setShowYardSelectionModal(false);
                setNotFoundData(null);
              }}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <Text style={styles.yardSelectionSubtitle}>
              Choose a yard to add this {notFoundData?.type === 'vin' ? 'VIN' : 'chip'} to:
            </Text>

            {yards.length > 0 ? (
              <FlatList
                data={yards}
                keyExtractor={(item) => item.id}
                style={styles.yardsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.yardCard}
                    onPress={() => {
                      setShowYardSelectionModal(false);
                      console.log('Navigating to YardDetailScreen with:', {
                        vinNumber: notFoundData?.scannedValue,
                        yardId: item.id,
                        yardName: item.name
                      });
                      // Navigate to YardDetailScreen with selected yard and VIN
                      navigation.navigate('YardDetailScreen', {
                        vinNumber: notFoundData?.scannedValue,
                        yardId: item.id,
                        yardName: item.name,
                        fromScreen: 'ScannerScreen'
                      });
                      setNotFoundData(null);
                    }}>
                    <Text style={styles.yardCardName}>
                      {item.name}
                    </Text>
                    <Text style={styles.yardCardAddress}>
                      {item.address}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyYardsContainer}>
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
    </View>
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
    zIndex: 1,
  },
  welcomeSection: {
    marginBottom: hp(4),
    alignItems: 'center',
    paddingHorizontal: spacings.medium,
  },
  titleWrapper: {
    marginBottom: spacings.xsmall,
  },
  welcomeTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#252837',
    textAlign: 'center',
    letterSpacing: -0.3,
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
    gap: spacings.xLarge,
    paddingBottom: hp(6),
  },
  addVehicleCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 0,
    overflow: 'visible',
    position: 'relative',
    minHeight: hp(13),
    // Enhanced Shadow for prominence
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(97, 62, 234, 0.15)',
  },
  addVehicleIconContainer: {
    backgroundColor: 'rgba(97, 62, 234, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(97, 62, 234, 0.3)',
  },
  addVehicleTitle: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#252837',
    marginBottom: spacings.xxsmall,
    letterSpacing: -0.2,
  },
  addVehicleDescription: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#646E77',
    lineHeight: 19,
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacings.xLarge,
    paddingHorizontal: spacings.small,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  dividerText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#646E77',
    marginHorizontal: spacings.medium,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  scanCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 0,
    overflow: 'visible',
    position: 'relative',
    minHeight: hp(12),
    // Enhanced Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacings.Large1x,
    zIndex: 2,
    position: 'relative',
  },
  iconContainer: {
    width: hp(9),
    height: hp(9),
    borderRadius: hp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacings.large,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vinIconContainer: {
    backgroundColor: 'rgba(97, 62, 234, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(97, 62, 234, 0.2)',
  },
  chipIconContainer: {
    backgroundColor: 'rgba(40, 167, 69, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.2)',
  },
  cardIcon: {
    // Icon styling handled in iconContainer
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: style.fontSizeMedium.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#252837',
    marginBottom: spacings.xxsmall,
    letterSpacing: -0.1,
  },
  cardDescription: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#646E77',
    lineHeight: 18,
    marginTop: 1,
  },
  arrowContainer: {
    marginLeft: spacings.medium,
    padding: spacings.xsmall,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  cardBackground: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '70%',
    height: '100%',
    opacity: 0.05,
    borderTopLeftRadius: 100,
  },
  vinCardBackground: {
    backgroundColor: '#613EEA',
  },
  chipCardBackground: {
    backgroundColor: '#28a745',
  },
  floatingSearchButton: {
    position: 'absolute',
    bottom: hp(15),
    right: spacings.Large1x,
    width: hp(7.5),
    height: hp(7.5),
    borderRadius: hp(3.75),
    backgroundColor: '#613EEA',
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced Shadow
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
    // Border for better definition
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: spacings.large,
    alignItems: 'center',
    width: widthPercentageToDP(80),
  },

  // Detail Modal Styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacings.Large1x,
    maxHeight: '80%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  detailModalTitle: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: 'black',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  detailLabel: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: style.fontSizeNormal.fontSize,
    color: 'black',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  closeButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: Platform.OS === 'ios' ? spacings.small : -5,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonSecondary: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  closeButtonSecondaryText: {
    color: '#666',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  viewDetailsButton: {
    backgroundColor: '#613EEA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: '700',
  },

  // Not Found Modal Styles
  notFoundModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: spacings.Large1x,
    width: widthPercentageToDP(85),
    alignItems: 'center',
  },
  notFoundModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  notFoundModalTitle: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#ff6b6b',
    flex: 1,
    textAlign: 'center',
    marginLeft: -40, // Center the title (accounting for close button)
  },
  notFoundContent: {
    alignItems: 'center',
    marginBottom: 25,
  },
  notFoundText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  notFoundQuestion: {
    fontSize: style.fontSizeMedium1x.fontSize,
    color: 'black',
    fontWeight: style.fontWeightMedium.fontWeight,
    textAlign: 'center',
  },
  notFoundButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  notFoundButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  singleButton: {
    flex: 0,
    minWidth: 120,
    maxWidth: 200,
  },
  noButton: {
    backgroundColor: '#f0f0f0',
  },
  yesButton: {
    backgroundColor: '#613EEA',
  },
  noButtonText: {
    color: '#666',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },
  yesButtonText: {
    color: 'white',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
  },

  // Yard Selection Modal Styles
  yardSelectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  yardSelectionModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacings.Large1x,
    maxHeight: '80%',
  },
  yardSelectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  yardSelectionModalTitle: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: 'black',
  },
  yardSelectionSubtitle: {
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
    justifyContent: 'center',
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
  emptyYardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 20,
  },
});
