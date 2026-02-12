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
import LinearGradient from 'react-native-linear-gradient';
import { spacings, style } from '../constants/Fonts';
import {
  greenColor,
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
  blackColor,
  lightBlackBackground,
  lightBlackBorder,
} from '../constants/Color';

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
        parkingYard: facilityMap[vehicle.facilityId] || vehicle.facilityId || 'Unknown Yard', // Use facility name instead of ID
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
    <LinearGradient
      colors={[
        gradientSoftTop,
        gradientSoftMid1,
        gradientSoftMid2,
        gradientSoftMid3,
        gradientSoftMid4,
        gradientSoftBottom,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
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
    </LinearGradient>
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
  headerTitle: {fontWeight: style.fontWeightBold.fontWeight, fontSize: style.fontSizeNormal.fontSize},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightBlackBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    marginHorizontal: spacings.xLarge,
    height: Platform.OS === 'ios' ? heightPercentageToDP(5.5) : heightPercentageToDP(6),
    borderWidth: 1.5,
    borderColor: lightBlackBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#333',
  },
  card: {
    padding: spacings.large,
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
    fontWeight: style.fontWeightThin1x.fontWeight,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#333',
  },
  activeBadge: {
    backgroundColor: greenColor,
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.xsmall,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontWeight: style.fontWeightMedium.fontWeight,
    fontSize: style.fontSizeSmall.fontSize,
    color: '#fff',
  },
  vehicleInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginBottom: spacings.xxsmall,
  },
  colorInfo: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#888',
    marginBottom: spacings.small,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  yardInfo: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: blackColor,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  slotInfo: {
    fontSize: style.fontSizeSmall2x.fontSize,
    color: '#FF6B35',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  chipInfo: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#28a745',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginTop: 4,
  },
  statusInfo: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#28a745',
    fontWeight: style.fontWeightMedium.fontWeight,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: style.fontSizeNormal.fontSize,
    color: 'gray',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
