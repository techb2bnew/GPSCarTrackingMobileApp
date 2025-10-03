import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // vector-icons
import AsyncStorage from '@react-native-async-storage/async-storage';
import {vinList} from '../constants/Constants';
import {heightPercentageToDP} from '../utils';

const SearchScreen = ({navigation}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);

  // Load all vehicles from AsyncStorage
  const loadAllVehicles = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      
      // Get all yards data for name lookup
      const savedYards = await AsyncStorage.getItem('parking_yards');
      let yardsData = [];
      if (savedYards) {
        yardsData = JSON.parse(savedYards);
      }
      
      let allVehiclesData = [];
      
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          // Extract yard ID from key (yard_1_vehicles -> 1)
          const yardId = key.replace('yard_', '').replace('_vehicles', '');
          
          // Find actual yard name
          const yard = yardsData.find(y => y.id === yardId);
          const actualYardName = yard ? yard.name : `Yard ${yardId}`;
          
          // Add yard information to each vehicle
          const vehiclesWithYard = parsedVehicles.map(vehicle => ({
            ...vehicle,
            yardId: yardId,
            parkingYard: actualYardName // Use actual yard name
          }));
          
          allVehiclesData = [...allVehiclesData, ...vehiclesWithYard];
        }
      }
      
      setAllVehicles(allVehiclesData);
    } catch (error) {
      console.error('Error loading vehicles from storage:', error);
    }
  };

  // Load vehicles on component mount
  useEffect(() => {
    loadAllVehicles();
  }, []);

  const handleSearch = text => {
    setSearchText(text);

    if (text.trim() === '') {
      setFilteredData([]); // blank hone par list clear
    } else {
      // Search in AsyncStorage data first
      const asyncStorageData = allVehicles?.filter(item => {
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

      // Also search in VIN list as fallback
      const vinListData = vinList?.filter(item => {
        const lowerText = text.toLowerCase();
        return (
          item.vin.toLowerCase().includes(lowerText) ||
          item.make.toLowerCase().includes(lowerText) ||
          item.model.toLowerCase().includes(lowerText) ||
          item.year.toString().includes(lowerText) ||
          item.parkingYard.toString().includes(lowerText)
        );
      });

      // Combine both results, prioritizing AsyncStorage data
      const combinedData = [...asyncStorageData, ...vinListData];
      
      // Remove duplicates based on VIN
      const uniqueData = combinedData.filter((item, index, self) => 
        index === self.findIndex(t => t.vin === item.vin)
      );
      
      setFilteredData(uniqueData);
    }
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('YardDetailScreen', {
          yardId: item.yardId,
          yardName: item.parkingYard,
          selectedVin: item
        })
      }>
      <Text style={styles.vin}>{item.vin}</Text>
      <Text style={styles.vehicleInfo}>
        {item.year} - {item.make} {item.model}
      </Text>
      <Text style={styles.yardInfo}>Parking Yard: {item.parkingYard}</Text>
      {item.chipId && (
        <Text style={styles.chipInfo}>Chip ID: {item.chipId}</Text>
      )}
      {item.isActive && (
        <Text style={styles.statusInfo}>Status: Active</Text>
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
    padding: 12,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    height: heightPercentageToDP(5),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  vin: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  yardInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  chipInfo: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 2,
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
