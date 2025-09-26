import React, {useState} from 'react';
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
import {vinList} from '../constants/Constants';
import {heightPercentageToDP} from '../utils';

const SearchScreen = ({navigation}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  const handleSearch = text => {
    setSearchText(text);

    if (text.trim() === '') {
      setFilteredData([]); // blank hone par list clear
    } else {
      const newData = vinList?.filter(item => {
        const lowerText = text.toLowerCase();
        return (
          item.vin.toLowerCase().includes(lowerText) ||
          item.make.toLowerCase().includes(lowerText) ||
          item.model.toLowerCase().includes(lowerText) ||
          item.year.toString().includes(lowerText) ||
          item.parkingYard.toString().includes(lowerText)
        );
      });
      setFilteredData(newData);
    }
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('YardDetailsScreen', {selectedVin: item})
      }>
      <Text style={styles.vin}>{item.vin}</Text>
      <Text>
        {item.year} - {item.make} {item.model}
      </Text>
      <Text>Parking Yard: {item.parkingYard}</Text>
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
          placeholder="Search VIN, Make, Model, Year..."
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
