import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useRoute} from '@react-navigation/native';
import {IMAGE_BACKGROUND_IMAGE} from '../assests/images';
import ParkingMap from '../components/ParkingMap';
import {heightPercentageToDP} from '../utils';
import {parkingYard, SingleVehInparkingYard} from '../constants/Constants';

const ParkingDetailsScreen = ({navigation}) => {
  const route = useRoute();
  const {vin, yard} = route.params;

  const [feeds, setFeeds] = useState([]);
  useEffect(() => {
    // fetchData();
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
    <SafeAreaView style={{flex: 1}}>
      {/* <ImageBackground style={styles.container} source={IMAGE_BACKGROUND_IMAGE} resizeMode="cover"> */}
      <ScrollView contentContainerStyle={{}}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={{height: heightPercentageToDP(30)}}>
          <ParkingMap
            parkingYards={SingleVehInparkingYard}
            single={true}
            vin={vin}
            zoomIn={true}
          />
        </View>
        {/* Parking Info */}
        <View style={{padding: 16, backgroundColor: '#ffff'}}>
          <Text style={styles.headerText}>Parking Details</Text>

          <View style={styles.sectionBox}>
            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Parking Yard</Text>
                <Text style={styles.value}>{yard}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Level</Text>
                <Text style={styles.value}>3</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Slot</Text>
                <Text style={styles.value}>34</Text>
              </View>
            </View>
          </View>

          {/* Vin Details */}
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.sectionBox}>
            <View style={styles.detailsRow}>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Vin </Text>
                <Text style={styles.value}>{vin}</Text>
              </View>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Vehicle</Text>
                <Text style={styles.value}>Tesla</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Make</Text>
                <Text style={styles.value}>Tesla</Text>
              </View>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Manufacture</Text>
                <Text style={styles.value}>TESLA, INC.</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Model Year</Text>
                <Text style={styles.value}>2023</Text>
              </View>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Plant City</Text>
                <Text style={styles.value}>FREMOONT</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailsBlock}>
                <Text style={styles.label}>Vehicle Type</Text>
                <Text style={styles.value}>Passenger Car</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* </ImageBackground> */}
    </SafeAreaView>
  );
};

export default ParkingDetailsScreen;

const styles = StyleSheet.create({
  container: {
    // padding: 16,
    // backgroundColor: '#fff',
    // flexGrow: 1,
  },
  headerRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 99999,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionBox: {
    borderWidth: 1,
    borderColor: '#FF8A80',
    borderRadius: 10,
    padding: 8,
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoBlock: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#FF6E63',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailsBlock: {
    flex: 1,
  },
});
