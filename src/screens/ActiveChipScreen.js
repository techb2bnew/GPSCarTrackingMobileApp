import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP } from '../utils';
import { vinList } from '../constants/Constants';
import { useFocusEffect } from '@react-navigation/native';
import { getActiveChips, getInactiveChips, moveChipToActive, getBatteryStatus, getTimeAgo } from '../utils/chipManager';


const ActiveChipScreen = ({ navigation, route }) => {
  const { type } = route.params;
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allChips, setAllChips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reassignment modal states
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedChip, setSelectedChip] = useState(null);
  const [yards, setYards] = useState([]);
  const [selectedYard, setSelectedYard] = useState(null);
  const [yardVehicles, setYardVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [reassignStep, setReassignStep] = useState(1); // 1: Select Yard, 2: Select Vehicle

  // Load chip data from chip manager
  const loadChipData = async () => {
    try {
      setIsLoading(true);
      let chipsData = [];
      
      if (type === 'active') {
        chipsData = await getActiveChips();
      } else if (type === 'inactive') {
        chipsData = await getInactiveChips();
      } else if (type === 'lowBattery') {
        // For low battery page, get ALL active chips and sort by battery level
        chipsData = await getActiveChips();
        
        // Sort chips by battery level (lowest first)
        // Critical (0-20%) at top, then Medium (20-60%), then Good (60-100%)
        chipsData.sort((a, b) => {
          const batteryA = a.batteryLevel !== null && a.batteryLevel !== undefined ? a.batteryLevel : 999;
          const batteryB = b.batteryLevel !== null && b.batteryLevel !== undefined ? b.batteryLevel : 999;
          return batteryA - batteryB; // Ascending order (lowest battery first)
        });
        
        console.log(`🔋 Loaded ${chipsData.length} active chips sorted by battery level`);
        const criticalCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel <= 20).length;
        const mediumCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel > 20 && c.batteryLevel <= 60).length;
        const goodCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel > 60).length;
        console.log(`🔋 Battery distribution: Critical=${criticalCount}, Medium=${mediumCount}, Good=${goodCount}`);
      }
      
      setAllChips(chipsData);
      console.log(`Loaded ${type} chips:`, chipsData.length);
    } catch (error) {
      console.error('Error loading chip data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadChipData();
    
    // Auto-refresh every 10 seconds for battery updates
    const refreshInterval = setInterval(() => {
      if (type === 'lowBattery') {
        console.log('🔄 Auto-refreshing battery data...');
        loadChipData();
      }
    }, 10000); // 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [type]);

  useFocusEffect(
    React.useCallback(() => {
      loadChipData();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredData(allChips);
    } else {
      const filtered = allChips?.filter(
        item =>
          item.vin?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.chipId?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.make?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.year?.toString().includes(searchText) ||
          item.lastVin?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.lastMake?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.lastModel?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchText, allChips]);

  useEffect(() => {
    setFilteredData(allChips);
  }, [type, allChips]);

  const getHeading = () => {
    switch (type) {
      case 'active':
        return 'Active Chips';
      case 'inactive':
        return 'In-Active Chips';
      case 'lowBattery':
        return 'Battery Status - All Chips';
      default:
        return 'Chips';
    }
  };

  // Load yards for reassignment
  const loadYards = async () => {
    try {
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        setYards(JSON.parse(savedYards));
      }
    } catch (error) {
      console.error('Error loading yards:', error);
    }
  };

  // Load vehicles from a yard
  const loadYardVehicles = async (yardId) => {
    try {
      const storageKey = `yard_${yardId}_vehicles`;
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      if (savedVehicles) {
        const vehicles = JSON.parse(savedVehicles);
        // Filter out vehicles that already have chips or are not active
        const availableVehicles = vehicles.filter(v => !v.chipId);
        setYardVehicles(availableVehicles);
      } else {
        setYardVehicles([]);
      }
    } catch (error) {
      console.error('Error loading yard vehicles:', error);
      setYardVehicles([]);
    }
  };

  // Handle reassignment
  const handleReassignChip = async () => {
    if (!selectedChip || !selectedVehicle || !selectedYard) {
      console.log('Error', 'Please select a yard and vehicle');
      return;
    }

    try {
      // Update vehicle with chip
      const storageKey = `yard_${selectedYard.id}_vehicles`;
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      
      if (savedVehicles) {
        const vehicles = JSON.parse(savedVehicles);
        const updatedVehicles = vehicles.map(v => {
          if (v.id === selectedVehicle.id) {
            return {
              ...v,
              chipId: selectedChip.chipId,
              isActive: true,
              lastUpdated: new Date().toISOString()
            };
          }
          return v;
        });
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedVehicles));
        
        // Move chip from inactive to active
        await moveChipToActive(selectedChip.chipId, {
          vehicleId: selectedVehicle.id,
          vin: selectedVehicle.vin,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          yardId: selectedYard.id,
          yardName: selectedYard.name
        });
        
       console.log('Success', 'Chip reassigned successfully!');
        setShowReassignModal(false);
        setReassignStep(1);
        setSelectedChip(null);
        setSelectedYard(null);
        setSelectedVehicle(null);
        
        // Reload chip data
        loadChipData();
      }
    } catch (error) {
      console.error('Error reassigning chip:', error);
      // Alert.alert('Error', 'Failed to reassign chip');
    }
  };

  const renderItem = ({ item, index }) => {
    // Determine if this is an active or inactive chip
    const isInactive = type === 'inactive';
    const isLowBattery = type === 'lowBattery';
    
    // Get display data based on chip type
    const displayVin = isInactive ? (item.lastVin || 'N/A') : (item.vin || 'N/A');
    const displayYear = isInactive ? (item.lastYear || 'N/A') : (item.year || 'N/A');
    const displayMake = isInactive ? (item.lastMake || 'N/A') : (item.make || 'N/A');
    const displayModel = isInactive ? (item.lastModel || 'N/A') : (item.model || 'N/A');
    const displayYardName = isInactive ? (item.lastYardName || 'N/A') : (item.yardName || 'N/A');
    
    // Get battery status
    const batteryStatus = getBatteryStatus(item.batteryLevel);
    
    // Check if we need to show section header (for lowBattery type)
    const showSectionHeader = isLowBattery && index === 0 || 
      (isLowBattery && index > 0 && 
       getBatteryStatus(filteredData[index - 1].batteryLevel).status !== batteryStatus.status);
    
    return (
      <View>
        {/* Section Header for Battery Status */}
        {showSectionHeader && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: batteryStatus.color }]} />
            <Text style={styles.sectionTitle}>
              {batteryStatus.status === 'critical' 
                ? '❌ Critical Battery (0-20%)'
                : batteryStatus.status === 'medium'
                ? '⚠️ Medium Battery (20-60%)'
                : batteryStatus.status === 'good'
                ? '✅ Good Battery (60-100%)'
                : '❓ Unknown Battery'}
            </Text>
          </View>
        )}
        
        <View style={styles.card}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          onPress={() => {
            if (!isInactive && item.vehicleId) {
              // Navigate to vehicle details for active chips
              navigation.navigate('VehicleDetailsScreen', { 
                vehicle: {
                  id: item.vehicleId,
                  vin: item.vin,
                  make: item.make,
                  model: item.model,
                  year: item.year,
                  chipId: item.chipId,
                  isActive: true
                },
                yardName: item.yardName,
                yardId: item.yardId 
              }); 
            }
          }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vin}>{displayVin}</Text>
            <Text style={styles.subText}>
              {displayYear} • {displayMake} {displayModel}
            </Text>
            <Text style={styles.chipText}>Chip: {item.chipId}</Text>
            <Text style={styles.yardText}>
              {isInactive ? 'Last Yard: ' : 'Yard: '}{displayYardName}
            </Text>
            
            {/* Battery Level Display for Low Battery Page */}
            {isLowBattery && item.batteryLevel !== null && item.batteryLevel !== undefined && (
              <View style={styles.batteryInfoContainer}>
                <View style={styles.batteryContainer}>
                  <Icon 
                    name={batteryStatus.status === 'critical' ? 'warning' : batteryStatus.status === 'medium' ? 'alert-circle' : 'checkmark-circle'} 
                    size={16} 
                    color={batteryStatus.color} 
                  />
                  <Text style={[styles.batteryText, { color: batteryStatus.color }]}>
                    Battery: {item.batteryLevel}% ({batteryStatus.label})
                  </Text>
                </View>
                {item.lastBatteryUpdate && (
                  <View style={styles.lastUpdateContainer}>
                    <Icon name="time-outline" size={12} color="#999" />
                    <Text style={styles.lastUpdateText}>
                      Updated {getTimeAgo(item.lastBatteryUpdate)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Status Tag or Reassign Button */}
        {isInactive ? (
          <TouchableOpacity
            style={styles.reassignButton}
            onPress={async () => {
              setSelectedChip(item);
              await loadYards();
              setShowReassignModal(true);
              setReassignStep(1);
            }}>
            <Icon name="link" size={16} color="#fff" />
            <Text style={styles.reassignButtonText}>Assign Vehicle</Text>
          </TouchableOpacity>
        ) : isLowBattery ? (
          <View
            style={[
              styles.batteryStatusBadge,
              {
                backgroundColor: batteryStatus.status === 'critical' 
                  ? 'rgba(242, 67, 105, 0.2)'
                  : batteryStatus.status === 'medium'
                  ? 'rgba(242, 137, 61, 0.2)'
                  : 'rgba(69, 198, 79, 0.2)',
              },
            ]}>
            <Icon 
              name={batteryStatus.status === 'critical' ? 'warning' : batteryStatus.status === 'medium' ? 'alert-circle' : 'checkmark-circle'} 
              size={14} 
              color={batteryStatus.color} 
            />
            <Text
              style={[
                styles.activeText,
                {
                  color: batteryStatus.color,
                  marginLeft: 4,
                },
              ]}>
              {batteryStatus.label}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.activeTag,
              {
                backgroundColor: 'rgba(0, 128, 0, 0.2)',
              },
            ]}>
            <Text
              style={[
                styles.activeText,
                {
                  color: 'green',
                },
              ]}>
              Active
            </Text>
          </View>
        )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>{getHeading()}</Text>
        </View>
        
        {/* Refresh Button for Battery Page */}
        {type === 'lowBattery' && (
          <TouchableOpacity 
            onPress={() => {
              console.log('🔄 Manual refresh battery data');
              loadChipData();
            }}
            style={styles.refreshButton}>
            <Icon name="refresh" size={24} color="#613EEA" />
          </TouchableOpacity>
        )}
      </View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search VIN, model, year..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Loading chip data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Icon name="battery-charging-outline" size={80} color="#ccc" />
              <Text style={styles.noData}>No {type} chips found</Text>
              <Text style={styles.noDataSubtext}>
                {type === 'active' 
                  ? 'No vehicles with active chips'
                  : type === 'inactive'
                  ? 'No vehicles with inactive chips'
                  : 'No active chips available for battery monitoring'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Reassignment Modal */}
      <Modal
        visible={showReassignModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReassignModal(false);
          setReassignStep(1);
          setSelectedChip(null);
          setSelectedYard(null);
          setSelectedVehicle(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reassignStep === 1 ? 'Select Yard' : 'Select Vehicle'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReassignModal(false);
                  setReassignStep(1);
                  setSelectedChip(null);
                  setSelectedYard(null);
                  setSelectedVehicle(null);
                }}>
                <Icon name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Chip Info */}
            <View style={styles.chipInfo}>
              <Text style={styles.chipInfoLabel}>Chip ID:</Text>
              <Text style={styles.chipInfoValue}>{selectedChip?.chipId}</Text>
            </View>

            {/* Step 1: Yard Selection */}
            {reassignStep === 1 && (
              <ScrollView style={styles.modalList}>
                {yards.length > 0 ? (
                  yards.map((yard) => (
                    <TouchableOpacity
                      key={yard.id}
                      style={[
                        styles.listItem,
                        selectedYard?.id === yard.id && styles.selectedListItem,
                      ]}
                      onPress={async () => {
                        setSelectedYard(yard);
                        await loadYardVehicles(yard.id);
                        setReassignStep(2);
                      }}>
                      <Icon name="business" size={24} color="#613EEA" />
                      <View style={styles.listItemText}>
                        <Text style={styles.listItemTitle}>{yard.name}</Text>
                        <Text style={styles.listItemSubtitle}>{yard.address}</Text>
                      </View>
                      <Icon name="chevron-forward" size={24} color="#999" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="business-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyStateText}>No yards available</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Step 2: Vehicle Selection */}
            {reassignStep === 2 && (
              <>
                <View style={styles.backButton}>
                  <TouchableOpacity
                    onPress={() => {
                      setReassignStep(1);
                      setSelectedVehicle(null);
                    }}
                    style={styles.backButtonContainer}>
                    <Icon name="arrow-back" size={20} color="#613EEA" />
                    <Text style={styles.backButtonText}>Back to Yards</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                  {yardVehicles.length > 0 ? (
                    yardVehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.listItem,
                          selectedVehicle?.id === vehicle.id && styles.selectedListItem,
                        ]}
                        onPress={() => {
                          setSelectedVehicle(vehicle);
                        }}>
                        <Icon name="car" size={24} color="#613EEA" />
                        <View style={styles.listItemText}>
                          <Text style={styles.listItemTitle}>{vehicle.vin}</Text>
                          <Text style={styles.listItemSubtitle}>
                            {vehicle.year} • {vehicle.make} {vehicle.model}
                          </Text>
                        </View>
                        {selectedVehicle?.id === vehicle.id && (
                          <Icon name="checkmark-circle" size={24} color="#28a745" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="car-outline" size={60} color="#ccc" />
                      <Text style={styles.emptyStateText}>No available vehicles in this yard</Text>
                      <Text style={styles.emptyStateSubtext}>
                        All vehicles already have chips assigned
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Assign Button */}
                {selectedVehicle && (
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={handleReassignChip}>
                    <Icon name="link" size={20} color="#fff" />
                    <Text style={styles.assignButtonText}>Assign to Vehicle</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 10,
    margin: 16,
    backgroundColor: '#f9f9f9',
    height: heightPercentageToDP(5),
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vin: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  activeTag: {
    backgroundColor: 'rgba(128, 6, 0, 0.2)', // semi-transparent green
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontWeight: '600',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color: '#bbb',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  chipText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  yardText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  batteryInfoContainer: {
    marginTop: 6,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  lastUpdateText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  batteryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f3f0ff',
    borderRadius: 8,
    marginLeft: 8,
  },
  reassignButton: {
    backgroundColor: '#613EEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reassignButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  chipInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#613EEA',
  },
  chipInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  chipInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
  },
  modalList: {
    maxHeight: 400,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedListItem: {
    borderColor: '#613EEA',
    borderWidth: 2,
    backgroundColor: '#f3f0ff',
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#613EEA',
    marginLeft: 8,
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ActiveChipScreen;
