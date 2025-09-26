import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { IMAGE_BACKGROUND_IMAGE } from '../assests/images';

const sampleVinData = [
  { vin: '1HGCM82633A004352', yard: 1 },
  { vin: '2HGFG11896H543789', yard: 2 },
  { vin: '3FAHP0HA6AR456789', yard: 3 },
  { vin: '4T1BE32K55U045678', yard: 4 },
  { vin: '5YJ3E1EA7KF123456', yard: 5 },
  { vin: 'JN8AS5MT9DW123456', yard: 6 },
  { vin: 'KMHD84LF0KU123456', yard: 7 },
  { vin: '1FTFW1ET1EFA12345', yard: 8 },
  { vin: 'WDBUF70J44A123456', yard: 9 },
  { vin: 'JH4KA9650MC123456', yard: 10 },
  { vin: 'WA1LFAFP4EA123456', yard: 11 },
  { vin: 'YV4952DL6D1234567', yard: 12 },
  { vin: '1G1ZT54824F123456', yard: 13 },
  { vin: '5N1AR2MM0FC123456', yard: 14 },
  { vin: '1C4RJFBG5FC123456', yard: 15 },
];



const VinListScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');

  const filteredList = sampleVinData.filter(item =>
    item.vin.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <Pressable
      style={styles.vinItem}
      onPress={() => navigation.navigate("ParkingDetailsScreen", {
        vin: item.vin,
        yard: item.yard, // Pass yard here
      })}
    >
      <Text style={styles.vinText}>{item.vin}</Text>
    </Pressable>
  );


  return (
    <ImageBackground style={{flex:1}} source={IMAGE_BACKGROUND_IMAGE} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vehicle Records</Text>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by VIN..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
            <Ionicons name="search" size={20} color="#999" />

          </View>

          {/* VIN List */}
          <FlatList
            data={filteredList}
            keyExtractor={(item, index) => `${item.vin}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>

  );
};

export default VinListScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    // backgroundColor: '#f2f2f2',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
    color: '#1e1e1e',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 16,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  vinItem: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  vinText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});
