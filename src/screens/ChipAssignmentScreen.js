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
  Platform,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP as hp } from '../utils';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { style, spacings } from '../constants/Fonts';
import { whiteColor, grayColor, darkgrayColor, blackColor, greenColor } from '../constants/Color';

const ChipAssignmentScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' or 'unassigned'
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    assigned: 0,
    unassigned: 0,
    total: 0,
  });

  // Function to get yard name from facility ID
  const getYardNameFromId = async (facilityId) => {
    try {
      if (!facilityId || facilityId === 'Unknown') return 'Unknown Yard';
      
      const { data, error } = await supabase
        .from('facility')
        .select('name')
        .eq('id', facilityId)
        .single();

      if (error) {
        console.error('Error fetching yard name:', error);
        return 'Unknown Yard';
      }

      return data?.name || 'Unknown Yard';
    } catch (error) {
      console.error('Error in getYardNameFromId:', error);
      return 'Unknown Yard';
    }
  };

  // Load vehicle data
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading vehicle data...');

      // Get all cars from Supabase
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*');

      if (carsError) {
        console.error('❌ Error fetching cars from Supabase:', carsError);
        setIsLoading(false);
        return;
      }

      console.log('✅ Fetched cars from Supabase:', carsData.length);

      // Get yard names for all unique facility IDs
      const uniqueFacilityIds = [...new Set(carsData.map(car => car.facilityId))];
      const yardNamesMap = {};

      for (const facilityId of uniqueFacilityIds) {
        yardNamesMap[facilityId] = await getYardNameFromId(facilityId);
      }

      // Process vehicles data
      const vehiclesData = carsData.map(car => {
        const chip = car.chip;
        const hasChip = chip && chip !== null && chip !== 'NULL' && chip.toString().trim() !== '' && chip.toString().trim() !== 'null';

        return {
          id: car.id || car.vin,
          vin: car.vin,
          chipId: hasChip ? car.chip : null,
          make: car.make || 'N/A',
          model: car.model || 'N/A',
          year: car.year || null,
          color: car.color || null,
          slotNo: car.slotNo || car.slot || null,
          yardId: car.facilityId || 'Unknown',
          yardName: yardNamesMap[car.facilityId] || 'Unknown Yard',
          isAssigned: hasChip,
        };
      });

      const assignedCount = vehiclesData.filter(v => v.isAssigned).length;
      const unassignedCount = vehiclesData.filter(v => !v.isAssigned).length;

      setAllVehicles(vehiclesData);
      setStats({
        assigned: assignedCount,
        unassigned: unassignedCount,
        total: vehiclesData.length,
      });
      filterVehicles(vehiclesData, activeTab, searchText);
      setIsLoading(false);

      console.log(`✅ Loaded ${vehiclesData.length} vehicles`);
      console.log(`📋 Assigned: ${assignedCount}`);
      console.log(`📋 Unassigned: ${unassignedCount}`);
    } catch (error) {
      console.error('❌ Error loading vehicle data:', error);
      setIsLoading(false);
    }
  };

  // Filter vehicles based on active tab and search text
  const filterVehicles = (vehicles, tab, search) => {
    let filtered = vehicles;

    // Filter by tab (assigned/unassigned)
    if (tab === 'assigned') {
      filtered = vehicles.filter(v => v.isAssigned);
    } else {
      filtered = vehicles.filter(v => !v.isAssigned);
    }

    // Filter by search text
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(v => {
        return (
          v.vin?.toLowerCase().includes(searchLower) ||
          v.make?.toLowerCase().includes(searchLower) ||
          v.model?.toLowerCase().includes(searchLower) ||
          v.chipId?.toLowerCase().includes(searchLower) ||
          v.yardName?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredData(filtered);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    filterVehicles(allVehicles, tab, searchText);
  };

  // Handle search text change
  const handleSearchChange = (text) => {
    setSearchText(text);
    filterVehicles(allVehicles, activeTab, text);
  };

  // Handle pull to refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadVehicleData();
    setRefreshing(false);
  }, []);

  // Load data on focus
  useFocusEffect(
    React.useCallback(() => {
      loadVehicleData();
    }, [])
  );

  // Render vehicle item
  const renderVehicleItem = ({ item }) => {
    const displayVin = item.vin || 'N/A';
    const displayMake = item.make || 'N/A';
    const displayModel = item.model || 'N/A';
    const displayYear = item.year || null;
    const displayColor = item.color || null;
    const displaySlot = item.slotNo || null;
    const displayYardName = item.yardName || 'Unknown Yard';

    // Build vehicle description
    const vehicleDesc = [
      displayMake,
      displayModel,
      displayYear && `(${displayYear})`,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <TouchableOpacity
        style={styles.vehicleCard}
        onPress={() => {
          if (item.id) {
            navigation.navigate('VehicleDetailsScreen', {
              vehicle: {
                id: item.id,
                vin: item.vin,
                make: item.make,
                model: item.model,
                year: item.year,
                color: item.color,
                chipId: item.chipId,
                isActive: item.isAssigned, // Will be updated by API in VehicleDetailsScreen
              },
              yardName: item.yardName,
              yardId: item.yardId,
            });
          }
        }}
        activeOpacity={0.7}>
        <View style={styles.vehicleContent}>
          <View style={styles.vehicleLeft}>
            <View style={styles.vinContainer}>
              <Icon name="car" size={20} color="#613EEA" />
              <Text style={styles.vinText}>{displayVin}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.isAssigned
                      ? 'rgba(40, 167, 69, 0.15)'
                      : 'rgba(242, 67, 105, 0.15)',
                    marginLeft: 8,
                  },
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.isAssigned ? '#28a745' : '#F24369',
                    },
                  ]}>
                  {item.isAssigned ? 'Assigned' : 'Unassigned'}
                </Text>
              </View>
            </View>
            <Text style={styles.vehicleInfo}>
              {vehicleDesc}
            </Text>
            {displayColor && (
              <View style={styles.detailRow}>
                <Icon name="color-palette-outline" size={14} color={grayColor} />
                <Text style={styles.detailText}>{displayColor}</Text>
              </View>
            )}
            {item.chipId && (
              <View style={styles.detailRow}>
                <Icon name="hardware-chip" size={14} color="green" />
                <Text style={styles.chipText}>
                  Chip:{' '}
                  <Text>
                    {item.chipId.slice(0, -3)}
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                      {item.chipId.slice(-3)}
                    </Text>
                  </Text>
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Icon name="business-outline" size={14} color={grayColor} />
              <Text style={styles.yardText}>{displayYardName}</Text>
            </View>
            {displaySlot && (
              <View style={styles.detailRow}>
                <Icon name="location-outline" size={14} color={grayColor} />
                <Text style={styles.detailText}>Slot: {displaySlot}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={blackColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chip Assignment</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isLoading}>
          <Icon 
            name="refresh" 
            size={24} 
            color={isLoading ? grayColor : blackColor} 
          />
        </TouchableOpacity>
      </View>

      {/* Statistics Card */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="checkmark-circle" size={20} color="#28a745" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Assigned</Text>
            <Text style={[styles.statValue, { color: '#28a745' }]}>
              {stats.assigned}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Icon name="close-circle" size={20} color="#F24369" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Unassigned</Text>
            <Text style={[styles.statValue, { color: '#F24369' }]}>
              {stats.unassigned}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Icon name="car" size={20} color="#613EEA" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: '#613EEA' }]}>
              {stats.total}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
          onPress={() => handleTabChange('assigned')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'assigned' && styles.activeTabText,
            ]}>
            Assigned
          </Text>
          <View style={[
            styles.tabBadge,
            activeTab === 'assigned' && styles.activeTabBadge
          ]}>
            <Text style={[
              styles.tabBadgeText,
              activeTab === 'assigned' && styles.activeTabBadgeText
            ]}>
              {stats.assigned}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unassigned' && styles.activeTab]}
          onPress={() => handleTabChange('unassigned')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'unassigned' && styles.activeTabText,
            ]}>
            Unassigned
          </Text>
          <View style={[
            styles.tabBadge,
            activeTab === 'unassigned' && styles.activeTabBadge
          ]}>
            <Text style={[
              styles.tabBadgeText,
              activeTab === 'unassigned' && styles.activeTabBadgeText
            ]}>
              {stats.unassigned}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={grayColor} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by VIN, Make,Chip ID, or Yard..."
          placeholderTextColor={grayColor}
          value={searchText}
          onChangeText={handleSearchChange}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearchChange('')}
            style={styles.clearButton}>
            <Icon name="close-circle" size={20} color={grayColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="car-outline" size={64} color={grayColor} />
          <Text style={styles.emptyText}>
            No {activeTab === 'assigned' ? 'Assigned' : 'Unassigned'} Vehicles
          </Text>
          <Text style={styles.emptySubtext}>
            {searchText
              ? 'Try adjusting your search'
              : `No vehicles found with ${activeTab === 'assigned' ? 'assigned' : 'unassigned'} chips`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id?.toString() || item.vin}
          renderItem={renderVehicleItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#613EEA']}
              tintColor="#613EEA"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: whiteColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacings.xLarge,
    paddingVertical: spacings.medium,
    backgroundColor:whiteColor,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: blackColor,
    ...style,
  },
  placeholder: {
    width: 40,
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacings.xLarge,
    paddingVertical: spacings.medium,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: whiteColor,
    padding: spacings.medium,
    borderRadius: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statContent: {
    marginLeft: spacings.small,
  },
  statLabel: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    ...style,
  },
  statValue: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: 'bold',
    marginTop: 2,
    ...style,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: whiteColor,
    paddingHorizontal: spacings.xLarge,
    paddingTop: spacings.Large1x,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: spacings.medium,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#613EEA',
  },
  tabText: {
    fontSize: 16,
    color: grayColor,
    ...style,
  },
  activeTabText: {
    color: '#613EEA',
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: '#613EEA',
  },
  tabBadgeText: {
    fontSize: 12,
    color: grayColor,
    fontWeight: 'bold',
    ...style,
  },
  activeTabBadgeText: {
    color: whiteColor,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: spacings.xLarge,
    marginTop: spacings.Large1x,
    marginBottom: spacings.medium,
    borderRadius: 12,
    paddingHorizontal: spacings.medium,
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
  },
  searchIcon: {
    marginRight: spacings.small,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: blackColor,
    ...style,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: spacings.xLarge,
    paddingBottom: hp(10),
  },
  vehicleCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    marginBottom: spacings.medium,
    padding: spacings.Large1x,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  vehicleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleLeft: {
    flex: 1,
  },
  vinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vinText: {
   fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#000',
    marginLeft: 8,
    ...style,
  },
  vehicleInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#555',
    marginTop: spacings.xxsmall,
    ...style,
  },
  chipText: {
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: 'green',
    ...style,
  },
  yardText: {
    fontSize: 14,
    color: darkgrayColor,
    ...style,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  detailText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: darkgrayColor,
    ...style,
  },
  vehicleRight: {
    marginLeft: spacings.medium,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    ...style,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacings.medium,
    color: grayColor,
    ...style,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacings.xxxxLarge,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: blackColor,
    marginTop: spacings.Large1x,
    ...style,
  },
  emptySubtext: {
    fontSize: 14,
    color: grayColor,
    marginTop: spacings.small,
    textAlign: 'center',
    ...style,
  },
});

export default ChipAssignmentScreen;

