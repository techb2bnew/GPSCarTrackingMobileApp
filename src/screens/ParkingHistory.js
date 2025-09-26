import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NOTIFICATION} from '../assests/images';
import Ble from '../components/Ble';

export default function ParkingHistory({navigation}) {
  const data = [
    {
      id: '1',
      name: 'Amanda Chase',
      vinID: 'vin-12345555',
      chipId: 'CPA-0129',
      space: 'Active',
      checkIn: '11:00 am',
      checkOut: '05:00 pm',
      date: '02/09/2019',
    },
    {
      id: '2',
      name: 'Amanda Chase',
      vinID: 'vin-12345555',
      chipId: 'CPA-0129',
      space: 'Inactive',
      checkIn: '1:00 pm',
      checkOut: '05:00 pm',
      date: '02/09/2019',
    },
    {
      id: '3',
      name: 'Amanda Chase',
      vinID: 'vin-12345555',
      chipId: 'CPA-0129',
      space: 'Active',
      checkIn: '8:00 pm',
      checkOut: '05:00 pm',
      date: '02/09/2019',
    },
  ];

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => navigation.navigate('ValidIDScreen')}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}></Text>
          <Text
            style={{
              color: item.space == 'Active' ? '#06a514ff' : 'red',
              fontWeight: 500,
            }}>
            {item?.space}
          </Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.time}>Chip ID:</Text>
          <Text>{item.chipId}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.time}>Vin ID:</Text>
          <Text>{item.vinID}</Text>
        </View>
        {/* <View style={styles.rowBetween}>
        <Text style={styles.time}>Time:</Text>
        <Text >{item.checkIn}</Text>
      </View> */}

        {/* <View style={styles.rowBetween}>
        <Text style={styles.time}>Date:</Text>
        <Text >{item.date}</Text>
      </View> */}
        <View style={styles.rowBetween}>
          <Text>{item.date}</Text>
          <Text>{item.checkIn}</Text>
          {/* <Text style={styles.time}>Added By:</Text> */}
          <Text>Mark Evans</Text>
        </View>
        {/* <View style={{alignSelf: 'flex-end'}}>
        <Text style={styles.time}>Added By:</Text>
        <Text>Mark Evans</Text>
      </View> */}

        <TouchableOpacity
          style={[styles.qrBtn, {position: 'absolute', bottom: -50}]}>
          <Ionicons name="qr-code" size={30} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Ble/>
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}>
          <Image
            source={NOTIFICATION}
            style={{
              height: 35,
              width: 35,
            }}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{padding: 16, overflow: 'hidden'}}
      />
      <View style={{height: 60}} /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {fontWeight: 'bold', fontSize: 16},
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    paddingBottom: 30,
    marginBottom: 40,
    // height:200,

    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {fontWeight: 'bold', fontSize: 16},
  // space: {color: 'gray'},
  uniqueId: {marginBottom: 8, marginTop: 4},
  time: {fontWeight: 'bold'},
  qrBtn: {
    backgroundColor: '#613EEA',
    borderRadius: 24,
    padding: 10,
    alignSelf: 'center',
    marginTop: 10,

    // Shadow for QR button
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  backBtn: {
    backgroundColor: 'purple',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});
