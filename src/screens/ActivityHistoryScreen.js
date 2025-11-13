import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NOTIFICATION } from '../assests/images';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { spacings, style } from '../constants/Fonts';
import { heightPercentageToDP } from '../utils';

const ActivityHistoryScreen = ({ navigation }) => {
  const [filter, setFilter] = useState('all');
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null); // null means "All Facilities"
  const [facilities, setFacilities] = useState([]);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [stats, setStats] = useState({
    assigned: 0,
    unassigned: 0,
    total: 0,
    selectedFacilities: 0,
    totalFacilities: 0,
  });

  // Load all facilities from Supabase
  const loadFacilities = async () => {
    try {
      setLoadingFacilities(true);
      const { data, error } = await supabase
        .from('facility')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error loading facilities:', error);
        setFacilities([]);
        return;
      }

      console.log(`✅ Loaded ${data?.length || 0} facilities`);
      // Debug: Log facility IDs
      if (data && data.length > 0) {
        console.log(`📋 Facility IDs:`, data.map(f => ({ id: f.id, name: f.name })));
      }
      setFacilities(data || []);
    } catch (error) {
      console.error('❌ Error loading facilities:', error);
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Load activity data from Supabase
  const loadActivityData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading activity history from Supabase...');

      // Get all vehicles with their history
      // Use assigneddate column (as per database schema)
      const { data: vehicles, error } = await supabase
        .from('cars')
        .select('*')
        .order('assigneddate', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading activity:', error);
        // Fallback: try ordering by id if assigneddate fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('cars')
          .select('*')
          .order('id', { ascending: false })
          .limit(50);

        if (fallbackError) {
          console.error('❌ Error loading activity (fallback):', fallbackError);
          setActivityData([]);
          return;
        }

        // Fetch facility names for all vehicles
        const facilityIds = [...new Set(fallbackData.map(v => v.facilityId).filter(Boolean))];
        const facilityMap = {};

        if (facilityIds.length > 0) {
          const { data: facilities } = await supabase
            .from('facility')
            .select('id, name')
            .in('id', facilityIds);

          if (facilities) {
            facilities.forEach(f => {
              facilityMap[f.id] = f.name;
            });
          }
        }

        // Use fallback data
        const activities = fallbackData.map((vehicle) => {
          // Only use assigneddate - no fallback
          let activityDate = null;

          if (vehicle.assigneddate) {
            activityDate = new Date(vehicle.assigneddate);
            const now = new Date();
            if (isNaN(activityDate.getTime()) || activityDate > now) {
              activityDate = null;
            }
          }

          return {
            id: vehicle.id,
            vin: vehicle.vin,
            make: vehicle.make,
            model: vehicle.model,
            slotNo: vehicle.slotNo,
            facility: facilityMap[vehicle.facilityId] || vehicle.facilityId || 'Unknown',
            facilityId: vehicle.facilityId,
            chip: vehicle.chip,
            color: vehicle.color,
            date: activityDate ? activityDate.toISOString().split('T')[0] : null,
            time: activityDate ? activityDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }) : null,
            action: vehicle.chip ? 'Chip Assigned' : 'Vehicle Added',
            timestamp: activityDate ? activityDate.getTime() : null,
          };
        });

        setActivityData(activities);
        return;
      }

      // Fetch facility names for all vehicles
      const facilityIds = [...new Set(vehicles.map(v => v.facilityId).filter(Boolean))];
      const facilityMap = {};

      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from('facility')
          .select('id, name')
          .in('id', facilityIds);

        if (facilities) {
          facilities.forEach(f => {
            facilityMap[f.id] = f.name;
          });
        }
      }

      // Transform to activity format with proper date handling
      const activities = vehicles.map((vehicle) => {
        // Only use assigneddate - no fallback
        let activityDate = null;

        if (vehicle.assigneddate) {
          activityDate = new Date(vehicle.assigneddate);
          // Validate date - if it's invalid or in the future, set to null
          const now = new Date();
          if (isNaN(activityDate.getTime()) || activityDate > now) {
            console.warn(`⚠️ Invalid or future date for vehicle ${vehicle.id}`);
            activityDate = null;
          }
        }

        return {
          id: vehicle.id,
          vin: vehicle.vin,
          make: vehicle.make,
          model: vehicle.model,
          slotNo: vehicle.slotNo,
          facility: facilityMap[vehicle.facilityId] || vehicle.facilityId || 'Unknown',
          facilityId: vehicle.facilityId,
          chip: vehicle.chip,
          color: vehicle.color,
          date: activityDate ? activityDate.toISOString().split('T')[0] : null,
          time: activityDate ? activityDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }) : null,
          action: vehicle.chip ? 'Chip Assigned' : 'Vehicle Added',
          timestamp: activityDate ? activityDate.getTime() : null, // Store timestamp for filtering
        };
      });

      console.log(`✅ Loaded ${activities.length} activities`);
      // Debug: Log facility IDs in activities
      const uniqueFacilityIds = [...new Set(activities.map(a => a.facilityId).filter(Boolean))];
      console.log(`📋 Unique facility IDs in activities:`, uniqueFacilityIds);
      setActivityData(activities);
    } catch (error) {
      console.error('❌ Error loading activity:', error);
      setActivityData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadFacilities();
    loadActivityData();
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadFacilities();
      loadActivityData();
    }, [])
  );

  const getFilteredData = () => {
    let filtered = activityData;

    // First filter by facility if selected
    if (selectedFacility !== null && selectedFacility !== undefined) {
      filtered = filtered.filter(item => {
        // Handle both string and number comparisons, and null/undefined
        const itemFacilityId = item.facilityId;
        const selectedId = selectedFacility;

        // If item has no facilityId, skip it when filtering by facility
        if (!itemFacilityId) {
          return false;
        }

        // Convert both to strings for comparison to handle type mismatches
        return String(itemFacilityId) === String(selectedId);
      });
      console.log(`🔍 Filtering by facility ID: ${selectedFacility}, Found ${filtered.length} items out of ${activityData.length} total`);
    } else {
      console.log(`🔍 Showing all facilities (${activityData.length} items)`);
    }

    // Then filter by time if not "all"
    if (filter !== 'all') {
      const days = parseInt(filter);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      filtered = filtered.filter(item => {
        // Only filter by assigneddate - if assigneddate is null, skip this item for day filters
        if (!item.timestamp || !item.date) {
          // No assigneddate - skip for day-based filters
          return false;
        }

        // Use timestamp from assigneddate
        const itemDate = new Date(item.timestamp);

        // Validate timestamp - if it's invalid or in future, skip this item
        const now = new Date();
        if (isNaN(itemDate.getTime()) || itemDate > now) {
          console.warn(`⚠️ Invalid or future assigneddate for item ${item.id}, skipping from filter`);
          return false; // Skip items with invalid/future dates
        }

        itemDate.setHours(0, 0, 0, 0); // Set to start of day

        // Calculate difference in days
        const diffTime = today.getTime() - itemDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Return true if item is within the specified number of days (including today)
        // diffDays >= 0 means the date is today or in the past
        // diffDays <= days means it's within the filter range
        return diffDays >= 0 && diffDays <= days;
      });
    }

    const facilityName = selectedFacility
      ? facilities.find(f => f.id === selectedFacility)?.name || 'Selected Facility'
      : 'All Facilities';
    console.log(`📊 Filter: ${facilityName}, Last ${filter === 'all' ? 'all' : filter + ' days'} (based on assigneddate), Filtered ${filtered.length} out of ${activityData.length} activities`);
    return filtered;
  };

  // Calculate facility-wise vehicle counts
  const getFacilityVehicleCounts = () => {
    const counts = {};
    const filtered = getFilteredData();
    
    filtered.forEach(item => {
      if (item.facilityId) {
        // Match facilityId with facilities array to get name
        const facility = facilities.find(f => {
          // Handle both string and number comparisons
          return String(f.id) === String(item.facilityId);
        });
        
        const facilityName = facility?.name || `Facility ${item.facilityId}`;
        
        if (!counts[facilityName]) {
          counts[facilityName] = 0;
        }
        counts[facilityName]++;
      }
    });
    
    return counts;
  };

  // Get vehicle count for a specific facility ID
  const getVehicleCountForFacility = (facilityId) => {
    if (facilityId === null || facilityId === undefined) {
      // All facilities - return total
      return activityData.length;
    }
    
    return activityData.filter(item => {
      if (!item.facilityId) return false;
      return String(item.facilityId) === String(facilityId);
    }).length;
  };

  // Update stats when data or selection changes
  useEffect(() => {
    if (activityData.length > 0) {
      const filtered = getFilteredData();
      const assignedCount = filtered.filter(v => v.chip).length;
      const unassignedCount = filtered.filter(v => !v.chip).length;
      setStats({
        assigned: assignedCount,
        unassigned: unassignedCount,
        total: filtered.length,
        selectedFacilities: selectedFacility ? 1 : facilities.length,
        totalFacilities: facilities.length,
      });
    }
  }, [activityData, selectedFacility, filter, facilities.length]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.vinRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.vinNumber}>{item.vin}</Text>
          <Text style={styles.vehicleInfo}>{item.make} {item.model}</Text>
          {item.date && item.time && (
            <Text style={styles.dateText}>{item.date} at {item.time}</Text>
          )}
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            backgroundColor: item.chip ? '#DFFFE1' : '#FFF4E6',
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
          <View style={styles.movementInfo}>
            <Text style={styles.facilityText}>
              Parking Yard : {item.facility}📍
            </Text>
          </View>
          {item.slotNo && (
            <View style={styles.movementInfo}>
              <Text style={[styles.movementText, { color: '#000', fontWeight: '600' }]}>
                Slot: {item.slotNo}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.activityRow}>
        <Text style={styles.activityText}>
          {item.action} {item.date && item.time ? `at ${item.time}` : ''}
        </Text>
        {item.chip && (
          <View style={styles.chipBadge}>
            <Ionicons name="radio-outline" size={14} color="#4CAF50" />
            <Text style={styles.chipText}>Chip: {item.chip}</Text>
          </View>
        )}
      </View>
      {item.color && (
        <Text style={styles.colorText}>Color: {item.color}</Text>
      )}
    </View>
  );
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        {/* <Ionicons name="menu" size={28} color="black" /> */}
        <Text style={styles.headerTitle}>Acitivity History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}>
          {/* <Image
            source={NOTIFICATION}
            style={{
              height: 35,
              width: 35,
            }}
          /> */}
        </TouchableOpacity>
        {/* <Ionicons name="person-circle" size={32} color="black" /> */}
      </View>

      {/* Facility Selector */}
      <View style={styles.facilitySelectorContainer}>
        <TouchableOpacity
          style={styles.facilitySelectorButton}
          onPress={() => setShowFacilityModal(true)}>
          <View style={styles.facilitySelectorContent}>
            <Ionicons name="business-outline" size={20} color="#613EEA" />
            <View style={{ flex: 1, marginLeft: spacings.small }}>
              <Text style={styles.facilitySelectorText}>
                {selectedFacility
                  ? facilities.find(f => f.id === selectedFacility)?.name || 'Select Facility'
                  : 'All Facilities'}
              </Text>
              <Text style={styles.facilitySelectorSubtext}>
                {selectedFacility ? (
                  `${stats.total} vehicles`
                ) : (
                  `${stats.totalFacilities} facilities • ${stats.total} vehicles`
                )}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
      <View style={styles.statCard}>
          <Ionicons name="car" size={20} color="#613EEA" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: '#613EEA' }]}>
              {stats.total}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Assigned</Text>
            <Text style={[styles.statValue, { color: '#28a745' }]}>
              {stats.assigned}
            </Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="close-circle" size={20} color="#F24369" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Unassigned</Text>
            <Text style={[styles.statValue, { color: '#F24369' }]}>
              {stats.unassigned}
            </Text>
          </View>
        </View>
        
      </View>

      {/* Facility Breakdown - Only show when "All" is selected */}
      {!selectedFacility && (
        <View style={styles.facilityBreakdownContainer}>
          <View style={styles.facilityBreakdownHeader}>
            <Ionicons name="business" size={20} color="#613EEA" />
            <Text style={styles.facilityBreakdownTitle}>
              {stats.totalFacilities} Facilities
            </Text>
          </View>
          <View style={styles.facilityBreakdownContent}>
            {Object.entries(getFacilityVehicleCounts()).map(([name, count], index) => (
              <View key={index} style={styles.facilityBreakdownBadge}>
                <Text style={styles.facilityBreakdownBadgeText}>
                  {name}: {count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        {['all', '10', '15', '30'].map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterButton,
              filter === option && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(option)}>
            <Text
              style={[
                styles.filterButtonText,
                filter === option && styles.filterButtonTextActive,
              ]}>
              {option === 'all' ? 'All' : `${option} Days`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Facility Selection Modal */}
      <Modal visible={showFacilityModal} transparent animationType="slide">
        <Pressable
          style={styles.facilityModalOverlay}
          onPress={() => setShowFacilityModal(false)}>
          <View
            style={styles.facilityModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.facilityModalHeader}>
              <Text style={styles.facilityModalTitle}>Select Facility</Text>
              <Pressable onPress={() => setShowFacilityModal(false)}>
                <Ionicons name="close" size={24} color="#fffff" />
              </Pressable>
            </View>

            <Text style={styles.facilityModalSubtitle}>
              Choose a facility to filter history:
            </Text>

            {loadingFacilities ? (
              <View style={styles.loadingFacilitiesContainer}>
                <ActivityIndicator size="small" color="#613EEA" />
                <Text style={styles.loadingFacilitiesText}>Loading facilities...</Text>
              </View>
            ) : facilities.length > 0 ? (
              <FlatList
                data={[{ id: null, name: 'All Facilities' }, ...facilities]}
                keyExtractor={(item) => item.id?.toString() || 'all'}
                style={styles.facilitiesList}
                contentContainerStyle={styles.facilitiesListContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const vehicleCount = getVehicleCountForFacility(item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.facilityCard,
                        selectedFacility === item.id && styles.selectedFacilityCard,
                      ]}
                      onPress={() => {
                        setSelectedFacility(item.id);
                        setShowFacilityModal(false);
                      }}>
                      <View style={styles.facilityCardContent}>
                        <Text
                          style={[
                            styles.facilityCardName,
                            selectedFacility === item.id && styles.selectedFacilityText,
                          ]}>
                          {item.name}
                        </Text>
                        <Text style={styles.facilityCardCount}>
                          {vehicleCount} vehicles
                        </Text>
                      </View>
                      {selectedFacility === item.id && (
                        <Ionicons name="checkmark-circle" size={22} color="#613EEA" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={styles.emptyFacilitiesContainer}>
                <Ionicons name="business-outline" size={80} color="#ccc" />
                <Text style={styles.emptyFacilitiesText}>No Facilities Found</Text>
                <Text style={styles.emptyFacilitiesSubtext}>
                  Please create a facility first
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : getFilteredData().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>No activity found</Text>
          <Text style={styles.emptySubText}>Activities will appear here when vehicles are added or updated</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredData()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: spacings.large,
            paddingBottom: heightPercentageToDP(10) // Add bottom padding to prevent items from hiding behind bottom bar
          }}
          refreshing={loading}
          onRefresh={loadActivityData}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default ActivityHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacings.large,
  },
  headerTitle: {
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: style.fontSizeNormal.fontSize
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: spacings.large,
    marginBottom: spacings.large,
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // elevation for Android
    elevation: 4,
  },
  vinNumber: {
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: spacings.small,
  },
  activityText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#333',
    marginBottom: spacings.xsmall,
  },
  slotText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.medium,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: '#666',
    ...style,
  },
  statValue: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: 'bold',
    marginTop: 2,
    ...style,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.medium,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: spacings.small,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacings.medium,
    paddingHorizontal: spacings.small,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#613EEA',
    borderColor: '#613EEA',
  },
  filterButtonText: {
    color: '#666',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    ...style,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: style.fontWeightBold.fontWeight,
  },
  dateText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#555',
    marginTop: spacings.xsmall,
  },
  vehicleInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    marginTop: spacings.xxsmall,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  facilityText: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#000',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacings.small,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacings.small,
    paddingVertical: spacings.xsmall,
    borderRadius: 12,
  },
  chipText: {
    fontSize: style.fontSizeExtraSmall.fontSize,
    color: '#4CAF50',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginLeft: spacings.xsmall,
  },
  colorText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#888',
    marginTop: spacings.small,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacings.small2x,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacings.ExtraLarge2x,
  },
  emptyText: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#999',
    marginTop: spacings.large,
  },
  emptySubText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#BBB',
    marginTop: spacings.small,
    textAlign: 'center',
  },
  vinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: 'green',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  arrow: {
    color: 'green',
    fontWeight: style.fontWeightBold.fontWeight,
  },
  badgeBox: {
    backgroundColor: '#DFFFE1', // light green background
    borderRadius: 20,
    paddingVertical: spacings.small,
    paddingHorizontal: spacings.small2x,
    alignSelf: 'flex-start',
    marginTop: spacings.small,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: 'green',
    fontWeight: style.fontWeightMedium.fontWeight,
    fontSize: style.fontSizeSmall1x.fontSize,
  },
  facilitySelectorContainer: {
    padding: spacings.large,
  },
  facilitySelectorButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // elevation for Android
    elevation: 2,
  },
  facilitySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facilitySelectorText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  facilitySelectorSubtext: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    marginTop: 2,
  },
  facilityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  facilityModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacings.large,
    paddingBottom: spacings.large,
    maxHeight: '80%',
    width: '100%',
  },
  facilityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacings.large,
    marginVertical: spacings.normal,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  facilityModalTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#000',
  },
  facilityModalSubtitle: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    padding: spacings.large,
    marginBottom: 0,
  },
  facilitiesList: {
    maxHeight: heightPercentageToDP(50),
  },
  facilitiesListContent: {
    paddingHorizontal: spacings.large,
    paddingTop: 0,
    paddingBottom: spacings.large,
  },
  facilityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacings.large,
    marginBottom: spacings.normal,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  selectedFacilityCard: {
    backgroundColor: '#F0EDFF',
    borderColor: '#613EEA',
    borderWidth: 2,
  },
  facilityCardContent: {
    flex: 1,
  },
  facilityCardName: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  facilityCardCount: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    marginTop: 4,
    ...style,
  },
  selectedFacilityText: {
    color: '#613EEA',
    fontWeight: style.fontWeightBold.fontWeight,
  },
  loadingFacilitiesContainer: {
    padding: spacings.ExtraLarge2x,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFacilitiesText: {
    marginTop: spacings.small,
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
  },
  emptyFacilitiesContainer: {
    padding: spacings.ExtraLarge2x,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFacilitiesText: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#999',
    marginTop: spacings.large,
  },
  emptyFacilitiesSubtext: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#BBB',
    marginTop: spacings.small,
    textAlign: 'center',
  },
  facilityBreakdownContainer: {
    backgroundColor: '#F8F9FA',
    padding: spacings.large,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  facilityBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.medium,
  },
  facilityBreakdownTitle: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#000',
    marginLeft: spacings.small,
    ...style,
  },
  facilityBreakdownContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacings.small,
  },
  facilityBreakdownBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: spacings.medium,
    paddingVertical: spacings.small,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  facilityBreakdownBadgeText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#333',
    fontWeight: style.fontWeightMedium.fontWeight,
    ...style,
  },
});
