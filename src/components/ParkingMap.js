import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Button, Alert, Image} from 'react-native';
import MapView, {Marker, Circle, Polygon} from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {CAR} from '../assests/images';

const SLOT_SIZE = 0.0001; // Adjust for slot size

const getSlotPolygon = (latitude, longitude, size = SLOT_SIZE) => {
  // Return array of coords making a square polygon around (lat, lng)
  return [
    {latitude: latitude + size, longitude: longitude - size},
    {latitude: latitude + size, longitude: longitude + size},
    {latitude: latitude - size, longitude: longitude + size},
    {latitude: latitude - size, longitude: longitude - size},
  ];
};

const ParkingMap = ({parkingYards, single, vin, zoomIn, selectedCar, home}) => {
  const mapRef = useRef(null);
  const [visibleCallouts, setVisibleCallouts] = useState([]);
  const [yards, setYards] = useState(parkingYards);
  const [carPosition, setCarPosition] = useState(null); // Current position of moving car
  const [carToFocus, setCarToFocus] = useState(null);
console.log("selectedCar>>>", selectedCar);

  useEffect(() => {
    if (selectedCar) {
      let found = null;

      // Loop through yards
      for (const yard of parkingYards) {
        // Loop through cars inside each yard
        for (const car of yard.cars) {
          const vinA = (car?.vin || '').toLowerCase().trim();
          const vinB = (selectedCar?.vin || '').toLowerCase().trim();

          if (vinA === vinB) {
            found = {
              ...car,
              yardId: yard.id,
              slotNumber: yard.cars.indexOf(car) + 1,
            };
            break;
          }
        }

        if (found) break; // 💨 Exit loop early if match found
      }

      if (found && mapRef.current) {
        setCarToFocus(found);

        // 🔍 Zoom to selected car
        mapRef.current.animateToRegion(
          {
            latitude: found.latitude,
            longitude: found.longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          },
          1000,
        );
      }
    }
  }, [selectedCar]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const ids = parkingYards?.map(yard => yard.id);
      setVisibleCallouts(ids);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [parkingYards]);


  useEffect(() => {
    if (zoomIn && mapRef.current) {
      const center = parkingYards[0]?.center;
      // First zoom (very far out)
      mapRef.current.animateToRegion(
        {
          latitude: center?.latitude,
          longitude: center?.longitude,
          latitudeDelta: 1.0, // 🚀 extremely zoomed out
          longitudeDelta: 1.0,
        },
        500,
      );

      // Second zoom (very close)
      setTimeout(() => {
        mapRef.current.animateToRegion(
          {
            latitude: center.latitude,
            longitude: center.longitude,
            latitudeDelta: home ? 0.002 : 0.0002, //  very close zoom
            longitudeDelta: home ? 0.002 : 0.0002,
          },
          1000, // slightly slower for smooth effect
        );
      }, 1000); // waits for first zoom to finish
    }
  }, []);

  return (
    <>
      <MapView
        ref={mapRef}
        style={{flex: 1}}
        mapType="satellite"
        initialRegion={{
          latitude: parkingYards[0]?.center?.latitude,
          longitude: parkingYards[0]?.center?.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}>
        {yards?.map(yard => (
          <View key={yard.id}>
            <View
              style={{
                width: 100,
                height: 100,
                border: 2,
                borderBlockColor: 'red',
              }}></View>
            <Polygon
              // coordinates={[
              //   {
              //     latitude: yard.center.latitude + yard.radius / 111000,
              //     longitude:
              //       yard.center.longitude -
              //       yard.radius /
              //         (111000 *
              //           Math.cos(yard.center.latitude * (Math.PI / 180))),
              //   },
              //   {
              //     latitude: yard.center.latitude + yard.radius / 111000,
              //     longitude:
              //       yard.center.longitude +
              //       yard.radius /
              //         (111000 *
              //           Math.cos(yard.center.latitude * (Math.PI / 180))),
              //   },
              //   {
              //     latitude: yard.center.latitude - yard.radius / 111000,
              //     longitude:
              //       yard.center.longitude +
              //       yard.radius /
              //         (111000 *
              //           Math.cos(yard.center.latitude * (Math.PI / 180))),
              //   },
              //   {
              //     latitude: yard.center.latitude - yard.radius / 111000,
              //     longitude:
              //       yard.center.longitude -
              //       yard.radius /
              //         (111000 *
              //           Math.cos(yard.center.latitude * (Math.PI / 180))),
              //   },
              // ]}
              coordinates={yard?.coordinates}
              strokeColor="red"
              fillColor="rgba(0, 0, 255, 0.1)"
              strokeWidth={1}
            />

            {/* {!selectedCar && (
              <Marker coordinate={yard.center}>
                <View>
                  <Icon name="map-marker" size={30} color="red" />
                  {visibleCallouts?.includes(yard.id) && (
                    <View style={styles.customCallout}>
                      <Text>{yard.name}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            )} */}

            {yard?.cars?.map((car, index) => {
              // Skip car 1-1 here since we animate it separately
              const isSelected = carToFocus?.vin === car.vin;
              const slotCoords = getSlotPolygon(car.latitude, car.longitude);

              if (car?.id === '1-1') return null;
              return (
                <React.Fragment key={car.id}>
                  {/* Car Marker */}
                  <Marker
                    coordinate={{
                      latitude: car.latitude,
                      longitude: car.longitude,
                    }}
                    title={single ? 'Parking Yard 1' : ''}
                    description={single ? vin : ''}>
                    {car?.show == 'yes' && !isSelected ? (
                      <Image source={CAR} style={{height: 30, width: 30}} resizeMode="contain" />
                    ) : (
                      // <Ionicons name="car-sport" size={12} color={'#000'} />
                      <Text></Text>
                    )}
                  </Marker>
                  {/* Car marker */}
                  {isSelected && (
                    <Marker
                      coordinate={{
                        latitude: car.latitude,
                        longitude: car.longitude,
                      }}
                      tracksViewChanges={false}>
                      <View style={{alignItems: 'center'}}>
                        {/* isSelected && */}

                        <Ionicons
                          name="car-sport"
                          size={20}
                          color={isSelected ? 'red' : '#000'}
                        />
                        {/* {isSelected && ( */}
                        <View style={styles.customCallout1}>
                          <Text style={{fontWeight: 'bold'}}>{car.vin}</Text>
                          <Text>Parking Yard: {car.parkingYard}</Text>
                          <Text>Slot: {carToFocus?.slotNumber}</Text>
                          <View
                            style={{
                              position: 'absolute',
                              marginHorizontal: '50%',
                              bottom: -8,
                              width: 15,
                              height: 15,
                              backgroundColor: '#fff',
                              transform: [{rotate: '45deg'}],
                            }}
                          />
                        </View>
                        {/* )} */}
                      </View>
                    </Marker>
                  )}
                  {/* Polygon showing slot border */}
                  {/* <Polygon
                    coordinates={slotCoords}
                    strokeColor="#008000" // green border for slot
                    strokeWidth={2}
                    fillColor="rgba(0, 128, 0, 0.1)" // slight transparent fill
                  /> */}

                  {/* Marker for slot number */}
                  <Marker
                    coordinate={{
                      latitude: car.latitude,
                      longitude: car.longitude,
                    }}
                    anchor={{x: 0.5, y: 0.5}}
                    tracksViewChanges={false} // performance optimization
                  >
                    <View
                      style={{
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingTop: 20,
                        minWidth: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={{
                          color: 'red',
                          fontWeight: 'bold',
                          fontSize: 14,
                        }}>
                        {/* {index + 1} */}
                      </Text>
                    </View>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* Moving Car 1 Marker */}
            {carPosition && (
              <Marker
                coordinate={carPosition}
                title="Moving Car"
                description="Car 1">
                <Ionicons name="car-sport" size={16} color="#000" />
              </Marker>
            )}
          </View>
        ))}
      </MapView>
    </>
  );
};

const styles = StyleSheet.create({
  moveButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  customCallout: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    width: 140,
    borderColor: '#ddd',
    elevation: 5,
  },
  customCallout1: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    width: 140,
    borderColor: '#ddd',
    elevation: 5,
  },
});

export default ParkingMap;

// import React, {useEffect, useRef, useState} from 'react';
// import {View, Text, StyleSheet, Button, Alert} from 'react-native';
// import MapView, {Marker, Circle, Polygon} from 'react-native-maps';
// import Icon from 'react-native-vector-icons/FontAwesome';
// import Ionicons from 'react-native-vector-icons/Ionicons';

// const SLOT_SIZE = 0.0001; // Adjust for slot size

// const getSlotPolygon = (latitude, longitude, size = SLOT_SIZE) => {
//   // Return array of coords making a square polygon around (lat, lng)
//   return [
//     {latitude: latitude + size, longitude: longitude - size},
//     {latitude: latitude + size, longitude: longitude + size},
//     {latitude: latitude - size, longitude: longitude + size},
//     {latitude: latitude - size, longitude: longitude - size},
//   ];
// };

// const ParkingMap = ({parkingYards, single, vin, zoomIn, selectedCar}) => {
//   const mapRef = useRef(null);
//   const [visibleCallouts, setVisibleCallouts] = useState([]);
//   const [yards, setYards] = useState(parkingYards);
//   const [carPosition, setCarPosition] = useState(null); // Current position of moving car
//   const [carToFocus, setCarToFocus] = useState(null);

//   useEffect(() => {
//     if (selectedCar) {
//       let found = null;

//       // Loop through yards
//       for (const yard of parkingYards) {
//         // Loop through cars inside each yard
//         for (const car of yard.cars) {
//           const vinA = (car?.vin || '').toLowerCase().trim();
//           const vinB = (selectedCar?.vin || '').toLowerCase().trim();

//           if (vinA === vinB) {
//             found = {
//               ...car,
//               yardId: yard.id,
//               slotNumber: yard.cars.indexOf(car) + 1,
//             };
//             break;
//           }
//         }

//         if (found) break; // 💨 Exit loop early if match found
//       }

//       if (found && mapRef.current) {
//         setCarToFocus(found);

//         // 🔍 Zoom to selected car
//         mapRef.current.animateToRegion(
//           {
//             latitude: found.latitude,
//             longitude: found.longitude,
//             latitudeDelta: 0.001,
//             longitudeDelta: 0.001,
//           },
//           1000,
//         );
//       }
//     }
//   }, [selectedCar]);

//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       const ids = parkingYards?.map(yard => yard.id);
//       setVisibleCallouts(ids);
//     }, 1000);
//     return () => clearTimeout(timeout);
//   }, [parkingYards]);

//   useEffect(() => {
//     if (zoomIn) {
//       if (mapRef.current) {
//         const center = parkingYards[0].center;
//         mapRef.current.animateToRegion(
//           {
//             latitude: center.latitude,
//             longitude: center.longitude,
//             latitudeDelta: 0.05,
//             longitudeDelta: 0.05,
//           },
//           1000,
//         );
//         setTimeout(() => {
//           mapRef.current.animateToRegion(
//             {
//               latitude: center.latitude,
//               longitude: center.longitude,
//               latitudeDelta: 0.02,
//               longitudeDelta: 0.02,
//             },
//             1000,
//           );
//         }, 500);
//         setTimeout(() => {
//           mapRef.current.animateToRegion(
//             {
//               latitude: center.latitude,
//               longitude: center.longitude,
//               latitudeDelta: 0.005,
//               longitudeDelta: 0.005,
//             },
//             1000,
//           );
//         }, 1000);
//         setTimeout(() => {
//           mapRef.current.animateToRegion(
//             {
//               latitude: center.latitude,
//               longitude: center.longitude,
//               latitudeDelta: 0.005,
//               longitudeDelta: 0.005,
//             },
//             1000,
//           );
//         }, 1500);
//       }
//     }
//   }, []);

//   return (
//     <>
//       <MapView
//         ref={mapRef}
//         style={{flex: 1}}
//         mapType="satellite"
//         initialRegion={{
//           latitude: parkingYards[0].center.latitude,
//           longitude: parkingYards[0].center.longitude,
//           latitudeDelta: 0.02,
//           longitudeDelta: 0.02,
//         }}>
//         {yards?.map(yard => (
//           <View key={yard.id}>
//             <View
//               style={{
//                 width: 100,
//                 height: 100,
//                 border: 2,
//                 borderBlockColor: 'red',
//               }}></View>
//             <Polygon
//               coordinates={[
//                 {
//                   latitude: yard.center.latitude + yard.radius / 111000,
//                   longitude:
//                     yard.center.longitude -
//                     yard.radius /
//                       (111000 *
//                         Math.cos(yard.center.latitude * (Math.PI / 180))),
//                 },
//                 {
//                   latitude: yard.center.latitude + yard.radius / 111000,
//                   longitude:
//                     yard.center.longitude +
//                     yard.radius /
//                       (111000 *
//                         Math.cos(yard.center.latitude * (Math.PI / 180))),
//                 },
//                 {
//                   latitude: yard.center.latitude - yard.radius / 111000,
//                   longitude:
//                     yard.center.longitude +
//                     yard.radius /
//                       (111000 *
//                         Math.cos(yard.center.latitude * (Math.PI / 180))),
//                 },
//                 {
//                   latitude: yard.center.latitude - yard.radius / 111000,
//                   longitude:
//                     yard.center.longitude -
//                     yard.radius /
//                       (111000 *
//                         Math.cos(yard.center.latitude * (Math.PI / 180))),
//                 },
//               ]}
//               strokeColor="red"
//               fillColor="rgba(0, 0, 255, 0.1)"
//               strokeWidth={1}
//             />

//             {/* {!selectedCar && (
//               <Marker coordinate={yard.center}>
//                 <View>
//                   <Icon name="map-marker" size={30} color="red" />
//                   {visibleCallouts?.includes(yard.id) && (
//                     <View style={styles.customCallout}>
//                       <Text>{yard.name}</Text>
//                     </View>
//                   )}
//                 </View>
//               </Marker>
//             )} */}

//             {yard?.cars?.map((car, index) => {
//               // Skip car 1-1 here since we animate it separately
//               const isSelected = carToFocus?.vin === car.vin;
//               const slotCoords = getSlotPolygon(car.latitude, car.longitude);

//               if (car.id === '1-1') return null;
//               return (
//                 <React.Fragment key={car.id}>
//                   {/* Car Marker */}
//                   <Marker
//                     coordinate={{
//                       latitude: car.latitude,
//                       longitude: car.longitude,
//                     }}
//                     title={single ? 'Parking Yard 1' : ''}
//                     description={single ? vin : ''}>
//                     {car?.show == 'yes' && !isSelected ? (
//                       <Ionicons name ="car-sport" size={12} color={'#000'} />
//                     ) : (
//                       <Text></Text>
//                     )}
//                   </Marker>
//                   {/* Car marker */}
//                   {isSelected && (
//                     <Marker
//                       coordinate={{
//                         latitude: car.latitude,
//                         longitude: car.longitude,
//                       }}
//                       tracksViewChanges={false}>
//                       <View style={{alignItems: 'center'}}>
//                         isSelected &&
//                         <Ionicons
//                           name="car-sport"
//                           size={40}
//                           color={isSelected ? '#913333' : '#000'}
//                         />
//                         {/* {isSelected && ( */}
//                         <View style={styles.customCallout1}>
//                           <Text style={{fontWeight: 'bold'}}>{car.vin}</Text>
//                           <Text>Parking Yard: {car.parkingYard}</Text>
//                           <Text>Slot: {carToFocus?.slotNumber}</Text>
//                           <View
//                             style={{
//                               position: 'absolute',
//                               marginHorizontal: '50%',
//                               bottom: -8,
//                               width: 15,
//                               height: 15,
//                               backgroundColor: '#fff',
//                               transform: [{rotate: '45deg'}],
//                             }}
//                           />
//                         </View>
//                         {/* )} */}
//                       </View>
//                     </Marker>
//                   )}
//                   {/* Polygon showing slot border */}
//                   {/* <Polygon
//                     coordinates={slotCoords}
//                     strokeColor="#008000" // green border for slot
//                     strokeWidth={2}
//                     fillColor="rgba(0, 128, 0, 0.1)" // slight transparent fill
//                   /> */}

//                   {/* Marker for slot number */}
//                   <Marker
//                     coordinate={{
//                       latitude: car.latitude,
//                       longitude: car.longitude,
//                     }}
//                     anchor={{x: 0.5, y: 0.5}}
//                     tracksViewChanges={false} // performance optimization
//                   >
//                     <View
//                       style={{
//                         borderRadius: 12,
//                         paddingHorizontal: 6,
//                         paddingTop: 20,
//                         minWidth: 24,
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                       }}>
//                       <Text
//                         style={{
//                           color: 'red',
//                           fontWeight: 'bold',
//                           fontSize: 14,
//                         }}>
//                         {/* {index + 1} */}
//                       </Text>
//                     </View>
//                   </Marker>
//                 </React.Fragment>
//               );
//             })}

//             {/* Moving Car 1 Marker */}
//             {carPosition && (
//               <Marker
//                 coordinate={carPosition}
//                 title="Moving Car"
//                 description="Car 1">
//                 <Ionicons name="car-sport" size={16} color="#000" />
//               </Marker>
//             )}
//           </View>
//         ))}
//       </MapView>
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   moveButton: {
//     position: 'absolute',
//     bottom: 20,
//     alignSelf: 'center',
//     backgroundColor: 'blue',
//     padding: 10,
//     borderRadius: 5,
//   },
//   customCallout: {
//     position: 'absolute',
//     bottom: 40,
//     backgroundColor: 'white',
//     padding: 10,
//     borderRadius: 5,
//     borderWidth: 1,
//     width: 140,
//     borderColor: '#ddd',
//     elevation: 5,
//   },
//   customCallout1: {
//     position: 'absolute',
//     bottom: 40,
//     backgroundColor: 'white',
//     padding: 10,
//     borderRadius: 5,
//     borderWidth: 1,
//     width: 140,
//     borderColor: '#ddd',
//     elevation: 5,
//   },
// });

// export default ParkingMap;
