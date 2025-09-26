import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP } from '../utils';
import { vinList } from '../constants/Constants';


const ActiveChipScreen = ({ navigation, route }) => {
  const { type } = route.params;
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredData(vinList);
    } else {
      const filtered = vinList?.filter(
        item =>
          item.vin.toLowerCase().includes(searchText.toLowerCase()) ||
          item.model.toLowerCase().includes(searchText.toLowerCase()) ||
          item.year.includes(searchText),
      );
      setFilteredData(filtered);
    }
  }, [searchText]);

  const getDataByType = () => {
    if (type === "active") return vinList.slice(0, 30);
    if (type === "inactive") return vinList.slice(30, 40);
    if (type === "lowBattery") return vinList.slice(40, 45);
    return [];
  };

  useEffect(() => {
    setFilteredData(getDataByType());
  }, [type]);

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
    <TouchableOpacity style={styles.card} onPress={() => { navigation.navigate('MapViewScreen'); }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.vin}>{item.vin}</Text>
        <Text style={styles.subText}>
          {item.year} • {item.make} {item.model}
        </Text>
      </View>
      {/* Green Tag */}
      <View
        style={[
          styles.activeTag,
          {
            backgroundColor:
              type == 'active'
                ? 'rgba(0, 128, 0, 0.2)'
                : type == 'inactive'
                  ? 'rgba(255, 13, 0, 0.2)'
                  : 'rgba(255, 13, 0, 0.2)',
          },
        ]}>
        <Text
          style={[
            styles.activeText,
            {
              color:
                type == 'active' ? 'green' : type == 'inactive' ? 'red' : 'red',
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
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.noData}>No Records Found</Text>}
      />
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
  },
});

export default ActiveChipScreen;
