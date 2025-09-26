import {Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import ParkingMap from '../components/ParkingMap';
import {SingleVehInparkingYard, parkingYards} from '../constants/Constants';
import {heightPercentageToDP as hp, widthPercentageToDP as wp} from '../utils';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import ParkingMap1 from '../components/ParkingMap1';


const MapViewScreen = ({navigation}) => {
  const [feeds, setFeeds] = useState([]);
  // console.log('feedsfeeds>>', feeds);
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(
        'https://api.thingspeak.com/channels/2991877/feeds.json?api_key=K9LPDXZ35BKOYFDM&results=1',
      );
      const json = await response.json();
      setFeeds(json.feeds); // Set the 'feeds' array in state
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  return (
    <View style={{flex: 1}}>
      {/* <Header title="Home" backArrow={true} /> */}
      <TouchableOpacity onPress={()=> navigation.goBack()} style={styles.notificationIcon}>
          <Ionicons name="arrow-back" size={32} color="black" />
        </TouchableOpacity>
      {/* <ParkingMap
        parkingYards={parkingYards}
        single={true}
        home={true}
      /> */}
      <ParkingMap1
        parkingYards={parkingYards}
        single={true}
        home={true}
      />
      
    </View>
  );
};

export default MapViewScreen;

const styles = StyleSheet.create({
  notificationIcon: {
    position: 'absolute',
    left: wp(2),
    top: hp(5),
    width: wp(15),
    height: wp(15),
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
