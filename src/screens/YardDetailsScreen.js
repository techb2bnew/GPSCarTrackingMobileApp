import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  ScrollView,
  Alert,
  Button,
  Platform,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

// import Modal from 'react-native-modal';
import {useFocusEffect} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Papa from 'papaparse';
import {parkingYards, vinList} from '../constants/Constants';
import ParkingMap from '../components/ParkingMap';
import {heightPercentageToDP, widthPercentageToDP} from '../utils';
import {
  FORD,
  HONDA,
  HUNDAYI,
  KIA,
  MAHINDRA,
  MARUTI,
  TATA,
  TOYOTA,
} from '../assests/images';
import ParkingMap1 from '../components/ParkingMap1';
// const vinList = [
//   {
//     id: '1',
//     vin: 'VIN-100001',
//     parkingYard: 1,
//   },
//   {
//     id: '2',
//     vin: 'VIN-100002',
//     parkingYard: 1,
//   },
//   {
//     id: '3',
//     vin: 'VIN-100003',
//     parkingYard: 1,
//   },
//   {
//     id: '4',
//     vin: 'VIN-100004',
//     parkingYard: 1,
//   },
//   {
//     id: '5',
//     vin: 'VIN-100005',
//     parkingYard: 1,
//   },
//   {
//     id: '6',
//     vin: 'VIN-100006',
//     parkingYard: 1,
//   },
//   {
//     id: '7',
//     vin: 'VIN-100007',
//     parkingYard: 1,
//   },
//   {
//     id: '8',
//     vin: 'VIN-100008',
//     parkingYard: 1,
//   },

//   {
//     id: '9',
//     vin: 'VIN-100009',
//     parkingYard: 1,
//   },
//   {
//     id: '10',
//     vin: 'VIN-1000010',
//     parkingYard: 1,
//   },
//   {
//     id: '11',
//     vin: 'VIN-1000011',
//     parkingYard: 1,
//   },
//   {
//     id: '12',
//     vin: 'VIN-1000012',
//     parkingYard: 1,
//   },
//   {
//     id: '13',
//     vin: 'VIN-1000013',
//     parkingYard: 1,
//   },
//   {
//     id: '14',
//     vin: 'VIN-1000014',
//     parkingYard: 1,
//   },
//   {
//     id: '15',
//     vin: 'VIN-1000015',
//     parkingYard: 1,
//   },
//   {
//     id: '16',
//     vin: 'VIN-1000016',
//     parkingYard: 1,
//   },
//   {
//     id: '17',
//     vin: 'VIN-1000017',
//     parkingYard: 1,
//   },
//   {
//     id: '18',
//     vin: 'VIN-1000018',
//     parkingYard: 1,
//   },
//   {
//     id: '19',
//     vin: 'VIN-1000019',
//     parkingYard: 1,
//   },
//   {
//     id: '20',
//     vin: 'VIN-1000020',
//     parkingYard: 1,
//   },

//   {
//     id: '21',
//     vin: 'VIN-1000021',
//     parkingYard: 2,
//   },

//   {
//     id: '22',
//     vin: 'VIN-1000022',
//     parkingYard: 2,
//   },

//   {
//     id: '23',
//     vin: 'VIN-1000023',
//     parkingYard: 2,
//   },
//   {
//     id: '24',
//     vin: 'VIN-1000024',
//     parkingYard: 2,
//   },
//   {
//     id: '25',
//     vin: 'VIN-1000025',
//     parkingYard: 2,
//   },
//   {
//     id: '26',
//     vin: 'VIN-1000026',
//     parkingYard: 2,
//   },
//   {
//     id: '27',
//     vin: 'VIN-1000027',
//     parkingYard: 2,
//   },
//   {
//     id: '28',
//     vin: 'VIN-1000028',
//     parkingYard: 2,
//   },
//   {
//     id: '29',
//     vin: 'VIN-1000029',
//     parkingYard: 2,
//   },
//   {
//     id: '30',
//     vin: 'VIN-1000030',
//     parkingYard: 2,
//   },
//   {
//     id: '31',
//     vin: 'VIN-1000031',
//     parkingYard: 2,
//   },
//   {
//     id: '32',
//     vin: 'VIN-1000032',
//     parkingYard: 3,
//   },
//   {
//     id: '33',
//     vin: 'VIN-1000033',
//     parkingYard: 3,
//   },
//   {
//     id: '34',
//     vin: 'VIN-1000034',
//     parkingYard: 3,
//   },
//   {
//     id: '35',
//     vin: 'VIN-1000035',
//     parkingYard: 3,
//   },

//   {
//     id: '36',
//     vin: 'VIN-1000036',
//     parkingYard: 3,
//   },
//   {
//     id: '37',
//     vin: 'VIN-1000037',
//     parkingYard: 3,
//   },
//   {
//     id: '38',
//     vin: 'VIN-1000038',
//     parkingYard: 3,
//   },
//   {
//     id: '39',
//     vin: 'VIN-1000039',
//     parkingYard: 3,
//   },
//   {
//     id: '40',
//     vin: 'VIN-1000040',
//     parkingYard: 3,
//   },
//   {
//     id: '41',
//     vin: 'VIN-1000041',
//     parkingYard: 3,
//   },
//   {
//     id: '42',
//     vin: 'VIN-1000042',
//     parkingYard: 3,
//   },

//   {
//     id: '43',
//     vin: 'VIN-1000043',
//     parkingYard: 3,
//   },
//   {
//     id: '44',
//     vin: 'VIN-1000044',
//     parkingYard: 3,
//   },
//   {
//     id: '45',
//     vin: 'VIN-1000045',
//     parkingYard: 3,
//   },
//   {
//     id: '46',
//     vin: 'VIN-1000046',
//     parkingYard: 3,
//   },
//   {
//     id: '47',
//     vin: 'VIN-1000047',
//     parkingYard: 3,
//   },
//   {
//     id: '48',
//     vin: 'VIN-1000048',
//     parkingYard: 3,
//   },
//   {
//     id: '49',
//     vin: 'VIN-1000049',
//     parkingYard: 3,
//   },
//   {
//     id: '50',
//     vin: 'VIN-1000050',
//     parkingYard: 3,
//   },
//   {
//     id: '51',
//     vin: 'VIN-1000051',
//     parkingYard: 3,
//   },
// ];
const {height} = Dimensions.get('window');
const YardDetailsScreen = ({navigation, route}) => {
  const [selectedCar, setSelectedCar] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const {isSelected, selectedVin} = route?.params;

  const parking_yard = parkingYards?.filter(
    yard => yard?.id == isSelected || selectedVin?.parkingYard,
  );
  const filteredVinList = vinList?.filter(
    v => v?.parkingYard === isSelected || selectedVin?.parkingYard,
  );

  const handleVinPress = item => {
    setSelectedCar({
      ...item,
      activities: [
        // Dummy activities, replace with your real data
        ` moved from slot 3 to 20`,
        ` inspected by John`,
        ` cleaned`,
        ` moved from slot 3 to 20`,
        // `${item.vin} inspected by John`,
        // `${item.vin} cleaned`,
      ],
    });
    setModalVisible(true);

    // Hide tab bar when modal opens
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'none'}});
  };
  useEffect(() => {
    if (selectedVin) {
      setSelectedCar({
        ...selectedVin,
        activities: [
          ` moved from slot 3 to 20`,
          ` inspected by John`,
          ` cleaned`,
        ],
      });
      setModalVisible(true);

      // Hide tab bar
      navigation.getParent()?.setOptions({tabBarStyle: {display: 'none'}});
    }
  }, [selectedVin]);
  // Function to get next available filename
  const getNextFilePath = async basePath => {
    let counter = 0;
    let filePath = basePath;

    // Loop until we find a free filename
    while (await RNFS.exists(filePath)) {
      counter++;
      const extIndex = basePath.lastIndexOf('.');
      const name = basePath.substring(0, extIndex);
      const ext = basePath.substring(extIndex);
      filePath = `${name}${counter}${ext}`;
    }

    return filePath;
  };

  const exportVinList = async data => {
    try {
      // Convert JSON → CSV
      const csv = Papa.unparse(data, {
        columns: ['vin', 'year', 'make', 'model', 'parkingYard'],
      });

      // Base path
      const basePath =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/vinList.csv`
          : `${RNFS.DocumentDirectoryPath}/vinList.csv`;

      // Get next available file path (vinList.csv, vinList1.csv, vinList2.csv, ...)
      const path = await getNextFilePath(basePath);

      // Write file
      await RNFS.writeFile(path, csv, 'utf8');
      Alert.alert('✅ Vin List Export Successful');
      // Alert.alert('✅ Export Successful', `File saved to:\n${path}`);
    } catch (error) {
      Alert.alert('❌ Export Failed', error.message);
    }
  };

  const closeModal = () => {
    setModalVisible(false);

    // Show tab bar again
    navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
  };

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({tabBarStyle: {display: 'flex'}});
    }, []),
  );

  //   const renderItem = ({ item, index }) => {
  //   const isEven = index % 2 === 0;
  //   const isSelectedVin = item?.id == selectedCar?.id;

  //   return (
  //     <TouchableOpacity
  //       style={[
  //         styles.card,
  //         {
  //           backgroundColor: isSelectedVin
  //             ? '#613EEA'
  //             : isEven
  //             ? '#F9F9F9'
  //             : '#FFFFFF',
  //           borderColor: isSelectedVin ? '#4326B5' : '#E0E0E0',
  //         },
  //       ]}
  //       onPress={() => handleVinPress(item)}>

  //       {/* VIN Row */}
  //       <View style={styles.rowBetween}>
  //         <Text style={isSelectedVin ? styles.vinFocused : styles.vin}>
  //           {item.vin}
  //         </Text>
  //         <Text style={styles.parkingYard}>
  //           Yard: {item.parkingYard}
  //         </Text>
  //       </View>

  //       {/* Car details row */}
  //       <View style={styles.row}>
  //         <Text style={styles.detail}>
  //           {item.year} • {item.make} {item.model}
  //         </Text>
  //       </View>
  //     </TouchableOpacity>
  //   );
  // };

  const renderItem = ({item, index}) => {
    const isEven = index % 2 === 0;
    const isSelectedVin = item?.id == selectedCar?.id;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isSelectedVin
              ? '#613EEA'
              : isEven
              ? '#F9F9F9'
              : '#FFFFFF',
            borderColor: isSelectedVin ? '#4326B5' : '#E0E0E0',
          },
        ]}
        onPress={() => handleVinPress(item)}>
        {/* VIN + ParkingYard Row */}
        <View style={styles.rowBetween}>
          <Text style={isSelectedVin ? styles.vinFocused : styles.vin}>
            {item.vin}
          </Text>
          <Text style={isSelectedVin ? styles.yardFocused : styles.yard}>
            Yard {item.parkingYard}
          </Text>
        </View>

        {/* Make, Model, Year */}
        <Text style={[styles.detail, {color: isSelectedVin ? '#fff' : '#000'}]}>
          {item.year} • {item.make} {item.model}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.wrapper}>
        <View style={styles.headerRow1}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={{height: heightPercentageToDP(40)}}>
          <ParkingMap1
            parkingYards={parking_yard}
            zoomIn={true}
            selectedCar={selectedCar}
          />
        </View>
        <Pressable
          style={[
            styles.notificationIcon,
            {
              display: 'flex',
              flexDirection: 'row',
              gap: 6,
              alignSelf: 'flex-end',
              backgroundColor: 'green',
              width: widthPercentageToDP(22),
              height: heightPercentageToDP(4),
              alignItems: 'center',
              justifyContent: 'center',
              margin: 10,
              borderRadius: 100,
            },
          ]}
          onPress={() => exportVinList(vinList)}>
          <Feather name="download-cloud" size={20} color="#fff" />
          <Text style={{alignSelf: 'center', color: '#fff', fontWeight: '700'}}>
            Export
          </Text>
        </Pressable>
        <FlatList
          data={filteredVinList}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{paddingBottom: 20}}
        />

        {/* Bottom Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}>
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable style={styles.modalContent}>
              <Pressable
                style={{
                  height: heightPercentageToDP(0.7),
                  width: widthPercentageToDP(20),
                  backgroundColor: '#613EEA',
                  position: 'absolute',
                  top: -1,
                  left: '43.5%',
                  borderBottomRightRadius: 20,
                  borderBottomLeftRadius: 20,
                }}></Pressable>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 200,
                }}>
                <Text style={styles.modalTitle}>VIN Details</Text>
                <Image
                  source={
                    selectedCar?.make === 'Honda'
                      ? HONDA
                      : selectedCar?.make === 'Hyundai'
                      ? HUNDAYI
                      : selectedCar?.make === 'Kia'
                      ? KIA
                      : selectedCar?.make === 'Maruti'
                      ? MARUTI
                      : selectedCar?.make === 'Mahindra'
                      ? MAHINDRA
                      : selectedCar?.make === 'Toyota'
                      ? TOYOTA
                      : selectedCar?.make === 'Ford'
                      ? FORD
                      : selectedCar?.make === 'Tata'
                      ? TATA
                      : null
                  }
                  style={{
                    height: 50,
                    width: 50,
                  }}
                />
              </View>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Text style={styles.modalText}>
                  VIN Number: {selectedCar?.vin}
                </Text>
                <Text
                  style={[styles.detail, {color: '#000', fontWeight: '700'}]}>
                  {selectedCar?.year} • {selectedCar?.make} {selectedCar?.model}
                </Text>
              </View>
              <Text style={styles.modalText}>
                {/* Slot Number: {selectedCar?.parkingYard} */}
              </Text>
              {/* Make, Model, Year */}

              <Text style={[styles.modalTitle, {marginTop: 10}]}>
                Activities
              </Text>
              {selectedCar?.activities?.length > 0 ? (
                <View style={{flex: 1}}>
                  <FlatList
                    data={selectedCar?.activities || []}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({item, index}) => (
                      <View style={styles.timelineItem}>
                        <View style={styles.timeline}>
                          <View style={styles.dot} />
                          {index !== selectedCar.activities.length - 1 && (
                            <View style={styles.verticalLine} />
                          )}
                        </View>
                        <Text style={styles.activityText}>{item}</Text>
                      </View>
                    )}
                  />
                </View>
              ) : (
                <Text style={styles.modalText}>No activities found.</Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default YardDetailsScreen;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow1: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 99999,
  },
  itemContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vinLabel: {
    color: '#000',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
  },
  vinLabelFocused: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
  },
  quantity: {
    color: '#000',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  quantityFOuced: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    height: height * 0.4, // 40% of screen height
    backgroundColor: '#ffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalText: {
    fontSize: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeline: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#613EEA',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#613EEA',
    marginTop: -1, // ensure it attaches directly to dot
  },
  activityText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
    marginBottom: 30,
  },

  card: {
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vin: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  vinFocused: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  yard: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  yardFocused: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  detail: {
    marginTop: 4,
    fontSize: 13,
  },
});
