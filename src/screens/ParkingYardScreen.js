// ParkingYardScreen.js
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Dimensions,
//   SafeAreaView,
//   ImageBackground,
// } from 'react-native';
// import {parkingYards} from '../constants/Constants';
// import useFacilityFetch from '../hooks/useFacilityFetch';

// const {width} = Dimensions.get('window');

// const ParkingYardScreen = ({navigation}) => {
//   const [selectedYard, setSelectedYard] = useState(null);

//   const renderItem = ({item}) => {
//     const isSelected = item?.id === selectedYard;

//     return (
//       <TouchableOpacity
//         style={[styles.card, isSelected && styles.selectedCard]}
//         onPress={() => {
//           setSelectedYard(item?.id),
//             navigation.navigate('YardDetailsScreen', {isSelected: item?.id});
//         }}>
//         <Text style={[styles.name, isSelected && styles.selectedText]}>
//           {item?.name}
//         </Text>
//         <Text style={[styles.address, isSelected && styles.selectedText]}>
//           {item?.address}
//         </Text>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <SafeAreaView style={{flex: 1}}>
//       <ImageBackground
//         style={{flex: 1}}
//         // source={IMAGE_BACKGROUND_IMAGE}
//         resizeMode="cover">
//         <View style={styles.container}>
//           <Text style={styles.title}>Parking Yards</Text>
//           {/* <FlatList
//             data={parkingYards}
//             keyExtractor={item => item.id}
//             renderItem={renderItem}
//             numColumns={2}
//             columnWrapperStyle={styles.row}
//             contentContainerStyle={styles.listContainer}
//           /> */}
//           <FlatList
//             data={parkingYards}
//             keyExtractor={item => item.id}
//             renderItem={renderItem}
//             contentContainerStyle={styles.listContainer} // keep padding
//           />
//         </View>
//       </ImageBackground>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 20,
//     paddingHorizontal: 16,
//     // backgroundColor: '#fff',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginBottom: 20,
//   },
//   listContainer: {
//     paddingBottom: 20,
//   },
//   row: {
//     justifyContent: 'space-between',
//     marginBottom: 16,
//   },
//   // card: {
//   //   width: (width - 48) / 2,
//   //   borderWidth: 1,
//   //   borderColor: '#c1b7ed',
//   //   borderRadius: 10,
//   //   padding: 12,
//   //   paddingVertical: 20,
//   //   backgroundColor: '#fff',
//   //   alignItems: 'center',
//   //   justifyContent: 'center',
//   // },
//   selectedCard: {
//     backgroundColor: '#d6d3e6',
//     borderColor: '#613EEA',
//   },
//   // name: {
//   //   fontWeight: 'bold',
//   //   fontSize: 17,
//   //   color: '#252837',
//   //   marginBottom: 4,
//   //   textAlign: 'center',
//   // },
//   // address: {
//   //   fontSize: 13,
//   //   color: '#252837',
//   //   textAlign: 'center',
//   // },
//   card: {
//     width: '100%', // full width
//     borderWidth: 1,
//     borderColor: '#c1b7ed',
//     borderRadius: 10,
//     padding: 16,
//     marginBottom: 12, // spacing between rows
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//   },
//   name: {
//     fontWeight: 'bold',
//     fontSize: 17,
//     color: '#252837',
//     marginBottom: 4,
//   },
//   address: {
//     fontSize: 13,
//     color: '#252837',
//   },
//   selectedText: {
//     color: '#613EEA',
//   },
// });

// export default ParkingYardScreen;
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // search icon
import {parkingYards} from '../constants/Constants';
import useFacilityFetch from '../hooks/useFacilityFetch';
import {heightPercentageToDP} from '../utils';

const ParkingYardScreen = ({navigation}) => {
  const [selectedYard, setSelectedYard] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredYards, setFilteredYards] = useState(parkingYards);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredYards(parkingYards); // show all when search empty
    } else {
      const filtered = parkingYards.filter(yard =>
        yard?.name?.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredYards(filtered);
    }
  }, [searchText]);

  const renderItem = ({item}) => {
    const isSelected = item?.id === selectedYard;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => {
          setSelectedYard(item?.id),
            navigation.navigate('YardDetailsScreen', {isSelected: item?.id});
        }}>
        <Text style={[styles.name, isSelected && styles.selectedText]}>
          {item?.name}
        </Text>
        <Text style={[styles.address, isSelected && styles.selectedText]}>
          {item?.address}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ImageBackground style={{flex: 1}} resizeMode="cover">
        <View style={styles.container}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 20,
              marginBottom: 20,
            }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.title}>Parking Yards</Text>
          </View>

          {/* 🔍 Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search parking yard..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* 📝 List */}
          <FlatList
            data={filteredYards}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.noData}>No Parking Yard Found</Text>
            }
          />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    // marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
    height: heightPercentageToDP(5),
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  selectedCard: {
    backgroundColor: '#d6d3e6',
    borderColor: '#613EEA',
  },
  name: {
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
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },
});

export default ParkingYardScreen;
