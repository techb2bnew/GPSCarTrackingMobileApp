import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import {
  ACTIVE,
  BATTERY,
  INACTIVE,
  MAP_ICON,
  MAP_IMAGE,
  NOTIFICATION,
  VEHICLE_REG,
} from '../assests/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DrawerMenu from '../components/DrawerMenu';
import ParkingMap from '../components/ParkingMap';
import {parkingYards} from '../constants/Constants';
import {
  heightPercentageToDP,
  heightPercentageToDP as hp,
  widthPercentageToDP,
  widthPercentageToDP as wp,
} from '../utils';
import {useFocusEffect} from '@react-navigation/native';
import ParkingYardScreen from './ParkingYardScreen';

const cardData = [
  // {
  //   id: 1,
  //   icon: VEHICLE_REG,
  //   text: 'Vehicles Registered',
  //   showRedDot: true,
  //   backgroundColor: '#613EEA',
  //   count: 40,
  // },
  {
    id: 1,
    icon: ACTIVE,
    text: 'Active Chips',
    backgroundColor: '#F2893D',
    count: 30,
    type: 'active',
  },
  {
    id: 2,
    icon: INACTIVE,
    text: 'In-Active Chips',
    backgroundColor: '#F24369',
    count: 10,
    type: 'inactive',
  },
  {
    id: 3,
    icon: BATTERY,
    text: 'Low Battery Chips',
    backgroundColor: '#45C64F',
    count: 5,
    type: 'lowBattery',
  },
];
export default function HomeScreen({navigation, setCheckUser}) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedYard, setSelectedYard] = useState(null);

  const renderItem = ({item}) => {
    const isSelected = item?.id === selectedYard;

    return (
      <TouchableOpacity
        style={[styles.card1, isSelected && styles.selectedCard]}
        onPress={() => {
          setSelectedYard(item?.id),
            navigation.navigate('YardDetailScreen', {yardId: item?.id,yardName:item?.name});
        }}>
        <Text style={[styles.name1, isSelected && styles.selectedText]}>
          {item?.name}
        </Text>
        <Text style={[styles.address, isSelected && styles.selectedText]}>
          {item?.address}
        </Text>
      </TouchableOpacity>
    );
  };
  const handlePress = item => {
    setDrawerOpen(true);

    // Hide tab bar when modal opens
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'none'}});
  };

  const closeModal = () => {
    setDrawerOpen(false);

    // Show tab bar again
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
  };
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
    }, []),
  );

  const handleOpenAR = () => {
    // Send static coordinates instead of yard center
    // Static location 500m away in Mohali
    const target = {latitude:30.713452,  longitude: 76.691131};
    navigation.navigate('ARNavigationScreen', {target});
  };

  return (
    <View style={[styles.container, {marginBottom: 0}]}>
      <View
        style={[
          styles.header,
          {position: 'absolute', top: 30, width: '100%', zIndex: 1},
        ]}>
        <TouchableOpacity onPress={handlePress}>
          <DrawerMenu
            isOpen={isDrawerOpen}
            onClose={closeModal}
            navigation={navigation}
            setCheckUser={setCheckUser}
          />
          <Ionicons name="menu" size={30} color="black" />
        </TouchableOpacity>
        {!isDrawerOpen && (
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchScreen')}>
            <Ionicons
              name="search"
              size={22}
              color="#555"
              style={{marginRight: 8}}
            />
            <Text style={{color: '#555'}}>
              Search VIN, Make, Model, Year...
            </Text>
            {/* <TextInput
            style={styles.input}
            placeholder="Search VIN, Make, Model, Year..."
             editable={false} 
          /> */}
          </TouchableOpacity>
        )}
        {/* <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
          <Ionicons name="search" size={30} color="black" />
        </TouchableOpacity> */}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={handleOpenAR} style={{marginRight: 12}}>
            <Ionicons name="navigate" size={28} color="#613EEA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationScreen')}>
            <Image
              source={NOTIFICATION}
              style={{
                height: 36,
                width: 36,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Map and Menu */}

        {/* <TouchableOpacity
        style={{
          position: 'absolute',
          backgroundColor: '#613EEA',
          top: 100,
          right: 14,
          zIndex: 999999,
          height: 36,
          width: 36,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 100,
        }}
        onPress={() => navigation.navigate('SearchScreen')}>
        <Ionicons name="search" size={20} color="#fff" />
      </TouchableOpacity> */}

        <View style={{height: hp(45)}}>
          <ParkingMap
            parkingYards={parkingYards}
            homeScreen={true}
            zoomIn={true}
            home={true}
          />
        </View>

        {/* Options Cards */}
        <View style={styles.cardsContainer}>
          {cardData?.map(item => (
            <TouchableOpacity
              key={item?.id}
              style={[
                styles.card,
                {marginLeft: 0, backgroundColor: item.backgroundColor},
              ]}
              onPress={() =>
                navigation.navigate('ActiveChipScreen', {type: item.type})
              }>
              <Text style={styles.cardText}>{item.text}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={[styles.cardText, {fontSize: 22}]}>
                  {item.count}
                </Text>
                <Image
                  source={item?.icon}
                  style={{
                    height: 40,
                    width: 40,
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{flex: 1, marginBottom: 100}}>
          <View style={{flex: 1, paddingTop: 20, paddingHorizontal: 16}}>
            <Text style={styles.title}>Parking Yards</Text>
            <FlatList
              data={parkingYards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer} // keep padding
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: heightPercentageToDP(5),
    width: widthPercentageToDP(64),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  drawer: {
    position: 'absolute',
    right: -100,
    top: 100,
  },
  headerTitle: {fontWeight: 'bold', fontSize: 16},
  topContainer: {backgroundColor: 'white'},
  mapPlaceholder: {position: 'relative', alignItems: 'flex-end'},
  mapImage: {
    width: '80%',
    height: 160,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 20,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'purple',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
  },
  detailsContainer: {marginTop: 40},
  locationText: {fontWeight: 'bold', fontSize: 18, textAlign: 'center'},
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingLeft: 16,
  },
  profileImage: {width: 60, height: 60, borderRadius: 30},
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'green',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {fontWeight: 'bold', fontSize: 16},
  role: {color: 'gray'},
  badge: {color: 'gray'},
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '48%',
    height: 140,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginBottom: 20,
    elevation: 4,
    // Bottom shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardText: {marginTop: 8, fontWeight: 600, fontSize: 15, color: '#fff'},
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    position: 'absolute',
    top: 10,
    right: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  card1: {
    width: '100%', // full width
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12, // spacing between rows
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  name1: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#252837',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#252837',
  },
  selectedText: {
    color: '#613EEA',
  },
});

// search globally ,
// facility list screen  changes add search functionality on facility screen ,
// Home screen changes,
// vin details screen changes ,
// make new screens active chips, in-active chips , and low battery chips  and add   logos and header changes
