import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, FlatList} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {widthPercentageToDP} from '../utils';
import AnimatedLottieView from 'lottie-react-native';
import BleTesting from '../components/BleTesting';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScanScreen({navigation, route}) {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showYardSelectionModal, setShowYardSelectionModal] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState(null);
  const [foundYardName, setFoundYardName] = useState('');
  const [notFoundData, setNotFoundData] = useState(null);
  const [yards, setYards] = useState([]);
  const [actualYardName, setActualYardName] = useState('');

  // Fetch yards data - same as HomeScreen
  const fetchYards = async () => {
    try {
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        setYards(JSON.parse(savedYards));
      }
    } catch (error) {
      console.error('Error loading yards:', error);
    }
  };

  // Get actual yard name from yardId
  const getActualYardName = async (yardId) => {
    try {
      const savedYards = await AsyncStorage.getItem('parking_yards');
      console.log('savedYards>>', savedYards);
      
      if (savedYards) {
        const yards = JSON.parse(savedYards);
        const yard = yards.find(y => y.id === yardId);
        return yard ? yard.name : `Yard ${yardId}`;
      }
      return `Yard ${yardId}`;
    } catch (error) {
      console.error('Error getting yard name:', error);
      return `Yard ${yardId}`;
    }
  };

  // Check if we're returning from ScannerScreen with vehicle data
  React.useEffect(() => {
    if (route?.params?.foundVehicle && route?.params?.foundYardName) {
      console.log('route.params.foundVehicle>>', route.params.foundVehicle);
      console.log('route.params.foundYardName>>', route.params.foundYardName);
      
      setFoundVehicle(route.params.foundVehicle);
      setFoundYardName(route.params.foundYardName);
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
      setNotFoundData(route.params.notFoundData);
      setShowNotFoundModal(true);
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

      {/* <BleTesting/> */}
       <Text style={styles.title}>Scan Options</Text> 

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ScannerScreen', { scanType: 'vin' })}
      >
        <Ionicons
          name="car-sport"
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.buttonText}>Scan VIN</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('ScannerScreen', { scanType: 'chip' })}
      >
        <Ionicons name="barcode" size={24} color="white" style={styles.icon} />
        <Text style={styles.buttonText}>Scan Tracker Chip</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <>
              <AnimatedLottieView
                source={require('../assets/scan.json')}
                autoPlay
                loop
                style={{width: 180, height: 300}}
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
                  <Text style={styles.detailLabel}>Make & Model</Text>
                  <Text style={styles.detailValue}>{foundVehicle?.make} {foundVehicle?.model}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={24} color="#613EEA" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Year</Text>
                  <Text style={styles.detailValue}>{foundVehicle?.year}</Text>
                </View>
              </View>

              {foundVehicle?.chipId && (
                <View style={styles.detailRow}>
                  <Ionicons name="hardware-chip" size={24} color="#28a745" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Chip ID</Text>
                    <Text style={[styles.detailValue, {color: '#28a745'}]}>{foundVehicle?.chipId}</Text>
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

              {foundVehicle?.isActive && (
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, {color: '#28a745'}]}>Active</Text>
                  </View>
                </View>
              )}
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setShowDetailModal(false);
                // Clear the vehicle data so it doesn't show again
                setFoundVehicle(null);
                setFoundYardName('');
              }}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Not Found Modal */}
      <Modal visible={showNotFoundModal} transparent animationType="slide">
        <View style={styles.notFoundModalOverlay}>
          <View style={styles.notFoundModalContent}>
            <View style={styles.notFoundModalHeader}>
              <Ionicons name="search" size={40} color="#ff6b6b" />
              <Text style={styles.notFoundModalTitle}>Not Found</Text>
              <Pressable onPress={() => {
                setShowNotFoundModal(false);
                setNotFoundData(null);
              }}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <View style={styles.notFoundContent}>
              <Text style={styles.notFoundText}>
                {notFoundData?.type === 'vin' 
                  ? 'This VIN number is not added to any yard yet.'
                  : 'This chip is not assigned to any vehicle yet.'
                }
              </Text>
              
              <Text style={styles.notFoundQuestion}>
                Do you want to add it to a yard?
              </Text>
            </View>

            <View style={styles.notFoundButtons}>
              <Pressable
                style={[styles.notFoundButton, styles.noButton]}
                onPress={() => {
                  setShowNotFoundModal(false);
                  setNotFoundData(null);
                }}>
                <Text style={styles.noButtonText}>No</Text>
              </Pressable>
              
              <Pressable
                style={[styles.notFoundButton, styles.yesButton]}
                onPress={async () => {
                  setShowNotFoundModal(false);
                  await fetchYards(); // Fetch yards data
                  setShowYardSelectionModal(true); // Show yard selection modal
                }}>
                <Text style={styles.yesButtonText}>Yes</Text>
              </Pressable>
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#613EEA',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,

    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: 'bold',
  },
  icon: {},
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
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
    padding: 25,
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
    fontSize: 24,
    fontWeight: 'bold',
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
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: 'black',
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
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
    padding: 25,
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
    fontSize: 22,
    fontWeight: 'bold',
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  notFoundQuestion: {
    fontSize: 18,
    color: 'black',
    fontWeight: '600',
    textAlign: 'center',
  },
  notFoundButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  notFoundButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  noButton: {
    backgroundColor: '#f0f0f0',
  },
  yesButton: {
    backgroundColor: '#613EEA',
  },
  noButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  yesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    padding: 25,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  yardSelectionSubtitle: {
    fontSize: 16,
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
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  yardCardName: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#252837',
    marginBottom: 4,
  },
  yardCardAddress: {
    fontSize: 13,
    color: '#252837',
  },
  emptyYardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyYardsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyYardsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
