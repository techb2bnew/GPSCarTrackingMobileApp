import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // vector-icons
import { useFocusEffect } from '@react-navigation/native';
import {heightPercentageToDP} from '../utils';
import { supabase } from '../lib/supabaseClient';
import { spacings } from '../constants/Fonts';

const SearchScreen = ({navigation}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);

  // Load all vehicles from Supabase
  const loadAllVehicles = async () => {
    try {
      console.log('🔍 Loading all vehicles from Supabase for search...');
      
      // Get all vehicles from Supabase
      const { data: vehicles, error } = await supabase
        .from('cars')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('❌ Error loading vehicles from Supabase:', error);
        setAllVehicles([]);
        return;
      }

      // Transform to match app format
      const allVehiclesData = vehicles.map(vehicle => ({
        id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        slotNo: vehicle.slotNo,
        chipId: vehicle.chip,
        chip: vehicle.chip,
        facilityId: vehicle.facilityId,
        parkingYard: vehicle.facilityId, // facilityId is the yard name
        yardId: vehicle.facilityId,
        isActive: vehicle.chip ? true : false,
      }));

      console.log(`✅ Loaded ${allVehiclesData.length} vehicles from Supabase`);
      setAllVehicles(allVehiclesData);
    } catch (error) {
      console.error('❌ Error loading vehicles from Supabase:', error);
      setAllVehicles([]);
    }
  };

  // Load vehicles on component mount
  useEffect(() => {
    loadAllVehicles();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAllVehicles();
    }, [])
  );

  const handleSearch = text => {
    setSearchText(text);

    if (text.trim() === '') {
      setFilteredData([]); // blank hone par list clear
    } else {
      // Search only in real AsyncStorage data
      const filteredResults = allVehicles?.filter(item => {
        const lowerText = text.toLowerCase();
        return (
          item.vin?.toLowerCase().includes(lowerText) ||
          item.make?.toLowerCase().includes(lowerText) ||
          item.model?.toLowerCase().includes(lowerText) ||
          item.year?.toString().includes(lowerText) ||
          item.parkingYard?.toString().includes(lowerText) ||
          item.chipId?.toLowerCase().includes(lowerText)
        );
      });
      
      setFilteredData(filteredResults || []);
    }
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('VehicleDetailsScreen', {
          vehicle: item,
          yardName: item.parkingYard,
          yardId: item.yardId
        })
      }>
      <View style={styles.cardHeader}>
        <Text style={styles.vin}>{item.vin}</Text>
        {item.isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      <Text style={styles.vehicleInfo}>
        {item.make} {item.model}
      </Text>
      {item.color && (
        <Text style={styles.colorInfo}>Color: {item.color}</Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.yardInfo}>📍 {item.parkingYard}</Text>
        {item.slotNo && (
          <Text style={styles.slotInfo}>Slot: {item.slotNo}</Text>
        )}
      </View>
      {item.chipId && (
        <Text style={styles.chipInfo}>🔗 Chip: {item.chipId}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity>
          <Text></Text>
        </TouchableOpacity>
      </View>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Icon name="search" size={22} color="#555" style={{marginRight: 8}} />
        <TextInput
          style={styles.input}
          placeholder="Search VIN, Make, Model, Year, Chip ID..."
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {/* List / No Data */}
      {searchText.length === 0 ? (
        // Default state: before search
        <View style={styles.noDataContainer}>
          <Icon name="search-outline" size={50} color="gray" />
          <Text style={styles.emptyText}>No data found</Text>
        </View>
      ) : filteredData.length === 0 ? (
        // After search but no match
        <View style={styles.noDataContainer}>
          <Icon name="alert-circle-outline" size={50} color="gray" />
          <Text style={styles.emptyText}>No data found</Text>
        </View>
      ) : (
        // Matching results
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          style={{paddingHorizontal: 16}}
        />
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacings.large,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacings.large,
    marginBottom: 20,
  },
  headerTitle: {fontWeight: 'bold', fontSize: 16},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
    marginHorizontal: spacings.xLarge,
    height: Platform.OS === 'ios' ? heightPercentageToDP(5) : heightPercentageToDP(5.5),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vin: {
    fontWeight: '700',
    fontSize: 17,
    color: '#333',
  },
  activeBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  vehicleInfo: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  colorInfo: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  yardInfo: {
    fontSize: 13,
    color: '#613EEA',
    fontWeight: '600',
  },
  slotInfo: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
  chipInfo: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 4,
  },
  statusInfo: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
    color: 'gray',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
