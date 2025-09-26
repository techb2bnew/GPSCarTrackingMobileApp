import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NOTIFICATION} from '../assests/images';

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

  const getFilteredData = () => {
    if (filter === 'all') return dummyData;
    const days = parseInt(filter);
    const today = new Date();
    const filtered = dummyData.filter(item => {
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
        <View>
          <Text style={styles.vinNumber}>{item.vin}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            backgroundColor: '#DFFFE1', // light green background
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 14,
          }}>
          {item.fromFacility && item.toFacility && (
            <View style={styles.movementInfo}>
              <Text style={styles.movementText}>
                Facility {item.fromFacility}
                <Text style={[styles.arrow, {fontSize: 16}]}> → </Text>
                Facility {item.toFacility}
              </Text>
            </View>
          )}
          {item.fromSlot && item.toSlot && (
            <View style={styles.movementInfo}>
              <Text
                style={[
                  styles.movementText,
                  {color: '#000', fontWeight: '400'},
                ]}>
                Slot {item.fromSlot}
                <Text
                  style={[
                    styles.arrow,
                    {fontSize: 16, color: '#000', fontWeight: '400'},
                  ]}>
                  {' '}
                  →{' '}
                </Text>
                Slot {item.toSlot}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* <Text style={styles.dateText}>{item.date}</Text> */}
      <View style={styles.divider} />
      <Text style={styles.activityText}>Car moved at {item.time}</Text>
      <Text style={styles.slotText}>
        Current slot: {item.toSlot ?? item.slot}
      </Text>
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

      <FlatList
        data={getFilteredData()}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{padding: 16}}
      />
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
    paddingHorizontal: 16,
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
