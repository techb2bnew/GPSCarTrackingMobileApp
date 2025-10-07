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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP } from '../utils';
import { vinList } from '../constants/Constants';
import { useFocusEffect } from '@react-navigation/native';


const ActiveChipScreen = ({ navigation, route }) => {
  const { type } = route.params;
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load real vehicle data from AsyncStorage
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      
      // Load saved yards to get real yard names
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
          // Add yard info to each vehicle
          const yardId = key.replace('yard_', '').replace('_vehicles', '');
          
          // Find the actual yard name from saved yards
          const yard = yardsData.find(y => y.id === yardId);
          const yardName = yard ? yard.name : `Yard ${yardId}`;
          
          const vehiclesWithYard = parsedVehicles.map(vehicle => ({
            ...vehicle,
            yardId: yardId,
            yardName: yardName
          }));
          allVehiclesData = [...allVehiclesData, ...vehiclesWithYard];
        }
      }
      
      setAllVehicles(allVehiclesData);
      console.log('Loaded vehicles:', allVehiclesData.length);
    } catch (error) {
      console.error('Error loading vehicle data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadVehicleData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadVehicleData();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredData(getDataByType());
    } else {
      const currentData = getDataByType();
      const filtered = currentData?.filter(
        item =>
          item.vin.toLowerCase().includes(searchText.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.make?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.year?.toString().includes(searchText),
      );
      setFilteredData(filtered);
    }
  }, [searchText, allVehicles]);

  const getDataByType = () => {
    if (!allVehicles || allVehicles.length === 0) return [];
    
    switch (type) {
      case "active":
        // Vehicles with chipId and isActive = true
        return allVehicles.filter(v => v.chipId && v.isActive);
      case "inactive":
        // Vehicles with chipId but isActive = false
        return allVehicles.filter(v => v.chipId && !v.isActive);
      case "lowBattery":
        // For now, return a subset of active vehicles as low battery (mock data)
        const activeVehicles = allVehicles.filter(v => v.chipId && v.isActive);
        return activeVehicles.slice(0, Math.floor(activeVehicles.length * 0.2)); // 20% of active vehicles
      default:
        return [];
    }
  };

  useEffect(() => {
    setFilteredData(getDataByType());
  }, [type, allVehicles]);

  const getHeading = () => {
    switch (type) {
      case 'active':
        return 'Active Chips';
      case 'inactive':
        return 'In-Active Chips';
      case 'lowBattery':
        return 'Low Battery Chips';
      default:
        return 'Chips';
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => { 
        navigation.navigate('VehicleDetailsScreen', { 
          vehicle: item, 
          yardName: item.yardName,
          yardId: item.yardId 
        }); 
      }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.vin}>{item.vin}</Text>
        <Text style={styles.subText}>
          {item.year} • {item.make} {item.model}
        </Text>
        {item.chipId && (
          <Text style={styles.chipText}>Chip: {item.chipId}</Text>
        )}
        {item.yardName && (
          <Text style={styles.yardText}>Yard: {item.yardName}</Text>
        )}
      </View>
      {/* Status Tag */}
      <View
        style={[
          styles.activeTag,
          {
            backgroundColor:
              type == 'active'
                ? 'rgba(0, 128, 0, 0.2)'
                : type == 'inactive'
                  ? 'rgba(255, 13, 0, 0.2)'
                  : 'rgba(255, 165, 0, 0.2)',
          },
        ]}>
        <Text
          style={[
            styles.activeText,
            {
              color:
                type == 'active' ? 'green' : type == 'inactive' ? 'red' : 'orange',
            },
          ]}>
          {type == 'active'
            ? 'Active'
            : type == 'inactive'
              ? 'Inactive'
              : 'Low Battery'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{getHeading()}</Text>
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
              <Text style={styles.noData}>No {type} chips found</Text>
              <Text style={styles.noDataSubtext}>
                {type === 'active' 
                  ? 'No vehicles with active chips'
                  : type === 'inactive'
                  ? 'No vehicles with inactive chips'
                  : 'No vehicles with low battery chips'
                }
              </Text>
            </View>
          }
        />
      )}
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
});

export default ActiveChipScreen;
