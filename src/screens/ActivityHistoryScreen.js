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
    loadActivityData();
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadActivityData();
    }, [])
  );

  const getFilteredData = () => {
    // "All" shows everything regardless of assigneddate
    if (filter === 'all') return activityData;
    
    const days = parseInt(filter);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    const filtered = activityData.filter(item => {
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
    
    console.log(`📊 Filter: Last ${filter} days (based on assigneddate), Filtered ${filtered.length} out of ${activityData.length} activities`);
    return filtered;
  };

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

      <View style={styles.filterContainer}>
        {['all','10', '15', '30'].map(option => (
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
              {option === 'all' ? 'All' : `Last ${option} days`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacings.normal,
  },
  filterButton: {
    paddingVertical: spacings.small,
    paddingHorizontal: spacings.small2x,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#613EEA',
  },
  filterButtonText: {
    color: '#000',
  },
  filterButtonTextActive: {
    color: '#fff',
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
});
