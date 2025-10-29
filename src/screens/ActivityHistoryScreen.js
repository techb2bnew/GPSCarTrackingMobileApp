import React, {useState, useEffect} from 'react';
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
import {NOTIFICATION} from '../assests/images';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { spacings } from '../constants/Fonts';

const {width} = Dimensions.get('window');

const dummyData = [
  {
    vin: 'VIN-12345',
    time: '10:30 AM',
    fromSlot: 3,
    toSlot: 30,
    fromFacility: 2,
    toFacility: 5,
    date: '2025-07-15',
  },
  {
    vin: 'VIN-54321',
    time: '11:00 AM',
    fromSlot: 5,
    toSlot: 20,
    fromFacility: 5,
    toFacility: 8,
    date: '2025-07-16',
  },
  {
    vin: 'VIN-67890',
    time: '11:30 AM',
    fromSlot: 9,
    toSlot: 18,
    fromFacility: 10,
    toFacility: 3,
    date: '2025-07-17',
  },
  {
    vin: 'VIN-09876',
    time: '12:00 PM',
    fromSlot: 7,
    toSlot: 23,
    fromFacility: 23,
    toFacility: 22,
    date: '2025-07-18',
  },
  {
    vin: 'VIN-24680',
    time: '12:30 PM',
    fromSlot: 2,
    toSlot: 10,
    fromFacility: 28,
    toFacility: 32,
    date: '2025-07-20',
  },
  {
    vin: 'VIN-13579',
    time: '1:00 PM',
    fromSlot: 24,
    toSlot: 78,
    fromFacility: 40,
    toFacility: 35,
    date: '2025-07-21',
  },
  {
    vin: 'VIN-11223',
    time: '1:30 PM',
    fromSlot: 40,
    toSlot: 12,
    date: '2025-07-22',
  },
];

const ActivityHistoryScreen = ({navigation}) => {
  const [filter, setFilter] = useState('all');
  const [activityData, setActivityData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load activity data from Supabase
  const loadActivityData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading activity history from Supabase...');

      // Get all vehicles with their history (recently added/updated)
      const { data: vehicles, error } = await supabase
        .from('cars')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading activity:', error);
        setActivityData([]);
        return;
      }

      // Transform to activity format
      const activities = vehicles.map((vehicle, index) => ({
        id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        slotNo: vehicle.slotNo,
        facility: vehicle.facilityId,
        chip: vehicle.chip,
        color: vehicle.color,
        date: new Date(vehicle.id).toISOString().split('T')[0], // Using ID timestamp as date
        time: new Date(vehicle.id).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        action: vehicle.chip ? 'Chip Assigned' : 'Vehicle Added',
      }));

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
    if (filter === 'all') return activityData;
    const days = parseInt(filter);
    const today = new Date();
    const filtered = activityData.filter(item => {
      const itemDate = new Date(item.date);
      const diffTime = Math.abs(today - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    });
    return filtered;
  };

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={styles.vinRow}>
        <View style={{flex: 1}}>
          <Text style={styles.vinNumber}>{item.vin}</Text>
          <Text style={styles.vehicleInfo}>{item.make} {item.model}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
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
              📍 {item.facility}
            </Text>
          </View>
          {item.slotNo && (
            <View style={styles.movementInfo}>
              <Text style={[styles.movementText, {color: '#000', fontWeight: '600'}]}>
                Slot: {item.slotNo}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.activityRow}>
        <Text style={styles.activityText}>
          {item.action} at {item.time}
        </Text>
        {item.chip && (
          <View style={styles.chipBadge}>
            <Ionicons name="radio-outline" size={14} color="#4CAF50" />
            <Text style={styles.chipText}>Chip Active</Text>
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
        {['10', '15', '30', 'all'].map(option => (
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
          contentContainerStyle={{padding: 16}}
          refreshing={loading}
          onRefresh={loadActivityData}
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
  headerTitle: {fontWeight: 'bold', fontSize: 16},
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // elevation for Android
    elevation: 4,
  },
  vinNumber: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  slotText: {
    fontSize: 14,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontWeight: '600',
  },
  facilityText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  colorText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
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
    fontSize: 14,
    color: 'green',
    fontWeight: '600',
  },
  arrow: {
    color: 'green',
    fontWeight: 'bold',
  },
  badgeBox: {
    backgroundColor: '#DFFFE1', // light green background
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: 'green',
    fontWeight: '600',
    fontSize: 14,
  },
});
