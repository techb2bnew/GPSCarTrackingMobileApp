// import React, {useEffect, useRef, useState} from 'react';
// import {View, StyleSheet, Image, ActivityIndicator, Text, Alert, FlatList} from 'react-native';
// import MapView, {Marker, AnimatedRegion} from 'react-native-maps';
// import {BleManager} from 'react-native-ble-plx';
// import {Buffer} from 'buffer';
// import {CAR} from '../assests/images';

// const manager = new BleManager();

// const Ble = () => {
//   const mapRef = useRef(null);
//   const [initialRegion, setInitialRegion] = useState(null);
//    const [devices, setDevices] = useState([]);
//   const animatedCoord = useRef(
//     new AnimatedRegion({
//       latitude: 0,
//       longitude: 0,
//       latitudeDelta: 0.01,
//       longitudeDelta: 0.01,
//     }),
//   ).current;

//   // 🔹 convert GPS format "3042.680232,07641.5344" -> decimal degrees
//   const convertToDecimal = (rawLat, rawLon) => {
//     // latitude = DDMM.mmmm
//     const latDeg = parseInt(rawLat.substring(0, 2), 10);
//     const latMin = parseFloat(rawLat.substring(2));
//     const latitude = latDeg + latMin / 60;

//     // longitude = DDDMM.mmmm
//     const lonDeg = parseInt(rawLon.substring(0, 3), 10);
//     const lonMin = parseFloat(rawLon.substring(3));
//     const longitude = lonDeg + lonMin / 60;

//     return {latitude, longitude};
//   };

//   const updateCarPosition = (latitude, longitude) => {
//     animatedCoord.timing({
//       latitude,
//       longitude,
//       duration: 2000,
//       useNativeDriver: false,
//     }).start();

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude,
//           longitude,
//           latitudeDelta: 0.001,
//           longitudeDelta: 0.001,
//         },
//         1000,
//       );
//     }
//   };

//   // 🔹 Start BLE scanning
//   useEffect(() => {
//    manager.startDeviceScan(null, null, (error, device) => {
//   if (error) {
//     console.error('Scan error:', error);
//     return;
//   }

//   // 🔹 Abhi aap yaha log kar rahe ho
//   console.log('BLE Device:', JSON.stringify(device, null, 2));
// // Alert.alert('BLE Device:', JSON.stringify(device, null, 2))
//   // 👇 Yahi jagah rawScanRecord decode karna hai
//   if (device.name && device.name.includes("GPS")) {
//   console.log("GPS Device found:", device.name, device.id);
// }
//  if (device) {
//         // device ko string me convert karke FlatList ke liye store karenge
//         const deviceStr = JSON.stringify(device, null, 2);

//         setDevices(prev => {
//           // duplicate na ho isliye filter
//           if (prev.find(d => d.id === device.id)) {
//             return prev;
//           }
//           return [...prev, { id: device.id, data: deviceStr }];
//         });
//       }
//   if (device.rawScanRecord) {
//     try {
//       const decoded = Buffer.from(device.rawScanRecord, "base64").toString("utf-8");
//       console.log("Decoded rawScanRecord:", decoded);

//       const parsed = JSON.parse(decoded);
//       console.log("Parsed JSON from rawScanRecord:", parsed);

//       if (parsed.gps) {
//         const [latStr, lonStr] = parsed.gps.split(",");
//         const { latitude, longitude } = convertToDecimal(latStr, lonStr);

//         console.log("Parsed GPS from rawScanRecord:", latitude, longitude);

//         if (!initialRegion) {
//           setInitialRegion({
//             latitude,
//             longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           });
//           animatedCoord.setValue({ latitude, longitude });
//         } else {
//           updateCarPosition(latitude, longitude);
//         }
//       }
//     } catch (err) {
//       console.warn("Error decoding rawScanRecord:", err);
//     }
//   }
// });

//     return () => {
//       manager.stopDeviceScan();
//     };
//   }, []);

// //   if (!initialRegion) {
// //     return (
// //       <View style={styles.center}>
// //         <ActivityIndicator size="large" color="blue" />
// //         <Text>Waiting for GPS data…</Text>
// //       </View>
// //     );
// //   }

//   return (
//     <View>

//     <MapView
//       ref={mapRef}
//       style={styles.map}
//       mapType="satellite"
//       initialRegion={initialRegion}>
//       <Marker.Animated coordinate={animatedCoord}>
//         <Image source={CAR} style={{width: 40, height: 40}} resizeMode="contain" />
//       </Marker.Animated>
//     </MapView>

//      {/* <Text style={styles.header}>Nearby BLE Devices</Text>
//       <FlatList
//         data={devices}
//         keyExtractor={item => item.id}
//         renderItem={({ item }) => (
//           <View style={styles.card}>
//             <Text style={styles.text}>{item.data}</Text>
//           </View>
//         )}
//       /> */}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   map: {flex: 1, height:600},
//   center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//    header: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
//    card: {
//     padding: 10,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     marginBottom: 10,
//     backgroundColor: "#f9f9f9",
//   },
//   text: { fontSize: 12, color: "#333" },
// });

// export default Ble;

// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   StyleSheet,
//   Image,
//   ActivityIndicator,
//   TouchableOpacity,
//   Text,
// } from 'react-native';
// import MapView, {Marker, AnimatedRegion} from 'react-native-maps';
// import StreetView from 'react-native-streetview'; // 👈 import
// import {CAR} from '../assests/images';

// const ParkingMap1 = () => {
//   const mapRef = useRef(null);
//   const [initialRegion, setInitialRegion] = useState(null);
//   const [showStreetView, setShowStreetView] = useState(false); // 👈 toggle state

//   const animatedCoord = useRef(
//     new AnimatedRegion({
//       latitude: 0,
//       longitude: 0,
//       latitudeDelta: 0.01,
//       longitudeDelta: 0.01,
//     }),
//   ).current;

//   const updateCarPosition = (latitude, longitude) => {
//     animatedCoord
//       .timing({
//         latitude,
//         longitude,
//         duration: 2000,
//         useNativeDriver: false,
//       })
//       .start();

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude,
//           longitude,
//           latitudeDelta: 0.0008,
//           longitudeDelta: 0.0008,
//         },
//         1000,
//       );
//     }
//   };

//   useEffect(() => {
//     const fetchLocation = async () => {
//       try {
//         const response = await fetch(
//           'https://techrepairtracker.base2brand.com/api/fetchGpsTracking',
//         );
//         const json = await response.json();

//         if (json?.status && json?.data?.length > 0) {
//           const latest = json.data[json.data.length - 1];
//           const latitude = parseFloat(latest.lat);
//           const longitude = parseFloat(latest.long);

//           if (!isNaN(latitude) && !isNaN(longitude)) {
//             if (!initialRegion) {
//               setInitialRegion({
//                 latitude,
//                 longitude,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//               });
//               animatedCoord.setValue({latitude, longitude});
//             } else {
//               updateCarPosition(latitude, longitude);
//             }
//           }
//         }
//       } catch (error) {
//         console.error('GPS Fetch Error:', error);
//       }
//     };

//     fetchLocation();
//     const interval = setInterval(fetchLocation, 2000);
//     return () => clearInterval(interval);
//   }, [initialRegion]);

//   if (!initialRegion) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="blue" />
//       </View>
//     );
//   }

//   return (
//     <View style={{flex: 1}}>
//       {showStreetView ? (
//         <StreetView
//           style={styles.map}
//           allGesturesEnabled={true}
//           coordinate={{
//             latitude: animatedCoord.__getValue().latitude,
//             longitude: animatedCoord.__getValue().longitude,
//           }}
//           pov={{
//             tilt: 0,
//             bearing: 0,
//             zoom: 1,
//           }}
//         />
//       ) : (
//         <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
//           <Marker.Animated coordinate={animatedCoord}>
//             <Image
//               source={CAR}
//               style={{height: 30, width: 30}}
//               resizeMode="contain"
//             />
//           </Marker.Animated>
//         </MapView>
//       )}

//       {/* Toggle Button */}
//       <TouchableOpacity
//         style={styles.toggleBtn}
//         onPress={() => setShowStreetView(!showStreetView)}>
//         <Text style={{color: 'white'}}>
//           {showStreetView ? 'Show Map' : 'Show Street View'}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   map: {
//     flex: 1,
//   },
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   toggleBtn: {
//     position: 'absolute',
//     bottom: 80,
//     alignSelf: 'center',
//     backgroundColor: 'black',
//     padding: 10,
//     borderRadius: 10,
//   },
// });

// export default ParkingMap1;

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   ActivityIndicator,
//   StyleSheet,
// } from 'react-native';

// const ApiList = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await fetch(
//           'https://techrepairtracker.base2brand.com/api/fetchGpsTracking',
//         );
//         const json = await response.json();

//         if (json?.status && json?.data) {
//           setData(json.data);
//         }
//       } catch (error) {
//         console.error('❌ API Fetch Error:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="blue" />
//       </View>
//     );
//   }

//   return (
//     <FlatList
//       data={data}
//       keyExtractor={(item, index) => index.toString()}
//       renderItem={({item}) => (
//         <View style={styles.card}>
//           <Text>Lat: {item.lat}</Text>
//           <Text>Long: {item.long}</Text>
//           <Text>Time: {item.time}</Text>
//         </View>
//       )}
//     />
//   );
// };

// const styles = StyleSheet.create({
//   loader: {flex: 1, justifyContent: 'center', alignItems: 'center'},
//   card: {
//     padding: 10,
//     margin: 8,
//     backgroundColor: '#f2f2f2',
//     borderRadius: 6,
//   },
// });

// export default ApiList;

const GOOGLE_MAPS_APIKEY = 'AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI'; // 👈 add your Google Maps API key
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   StyleSheet,
//   Image,
//   ActivityIndicator,
//   TouchableOpacity,
//   Text,
//   Animated,
// } from 'react-native';
// import MapView, {Marker, AnimatedRegion} from 'react-native-maps';
// import MapViewDirections from 'react-native-maps-directions';
// import StreetView from 'react-native-streetview';
// import {CAR} from '../assests/images';

// const ParkingMap1 = () => {
//   const mapRef = useRef(null);
//   const [initialRegion, setInitialRegion] = useState(null);
//   const [showStreetView, setShowStreetView] = useState(false);

//   const animatedCoord = useRef(
//     new AnimatedRegion({
//       latitude: 0,
//       longitude: 0,
//       latitudeDelta: 0.01,
//       longitudeDelta: 0.01,
//     }),
//   ).current;

//   const [bearing, setBearing] = useState(0);
//   const [targetCoord, setTargetCoord] = useState(null);

//   // bearing calculate helper
//   const calculateBearing = (lat1, lon1, lat2, lon2) => {
//     const dLon = ((lon2 - lon1) * Math.PI) / 180;
//     lat1 = (lat1 * Math.PI) / 180;
//     lat2 = (lat2 * Math.PI) / 180;

//     const y = Math.sin(dLon) * Math.cos(lat2);
//     const x =
//       Math.cos(lat1) * Math.sin(lat2) -
//       Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

//     return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
//   };

//   // street arrow rotation
//   const arrowRotation = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(arrowRotation, {
//       toValue: bearing,
//       duration: 800,
//       useNativeDriver: true,
//     }).start();
//   }, [bearing]);

//   const rotateArrow = arrowRotation.interpolate({
//     inputRange: [0, 360],
//     outputRange: ['0deg', '360deg'],
//   });

//   useEffect(() => {
//     const fetchLocation = async () => {
//       try {
//         const response = await fetch(
//           'https://techrepairtracker.base2brand.com/api/fetchGpsTracking',
//         );
//         const json = await response.json();

//         if (json?.status && json?.data?.length > 0) {
//           const latest = json.data[json.data.length - 1];
//           const latitude = parseFloat(latest.lat);
//           const longitude = parseFloat(latest.long);

//           if (!isNaN(latitude) && !isNaN(longitude)) {
//             if (!initialRegion) {
//               setInitialRegion({
//                 latitude,
//                 longitude,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//               });
//               animatedCoord.setValue({latitude, longitude});
//             }

//             // Target 500m ahead
//             const target = {
//               latitude: latitude + 0.0045, // approx 500m north
//               longitude,
//             };
//             setTargetCoord(target);
//           }
//         }
//       } catch (error) {
//         console.error('GPS Fetch Error:', error);
//       }
//     };

//     fetchLocation();
//     const interval = setInterval(fetchLocation, 2000);
//     return () => clearInterval(interval);
//   }, [initialRegion]);

//   if (!initialRegion) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color="blue" />
//       </View>
//     );
//   }

//   return (
//     <View style={{flex: 1}}>
//       {showStreetView ? (
//         <>
//           <StreetView
//             style={styles.map}
//             allGesturesEnabled={true}
//             coordinate={{
//               latitude: animatedCoord.__getValue().latitude,
//               longitude: animatedCoord.__getValue().longitude,
//             }}
//             pov={{
//               tilt: 0,
//               bearing: bearing,
//               zoom: 1,
//             }}
//           />

//         </>
//       ) : (
//         <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
//           <Marker.Animated coordinate={animatedCoord}>
//             <Image
//               source={CAR}
//               style={{height: 30, width: 30}}
//               resizeMode="contain"
//             />
//           </Marker.Animated>

//           {targetCoord && (
//             <MapViewDirections
//               origin={{
//                 latitude: animatedCoord.__getValue().latitude,
//                 longitude: animatedCoord.__getValue().longitude,
//               }}
//               destination={targetCoord}
//               apikey={GOOGLE_MAPS_APIKEY}
//               strokeWidth={4}
//               strokeColor="blue"
//               mode="DRIVING"
//               onReady={result => {
//                 if (result.coordinates.length > 1) {
//                   const start = result.coordinates[0];
//                   const next = result.coordinates[1];
//                   const brng = calculateBearing(
//                     start.latitude,
//                     start.longitude,
//                     next.latitude,
//                     next.longitude,
//                   );
//                   setBearing(brng);
//                 }
//               }}
//             />
//           )}
//         </MapView>
//       )}

//       <TouchableOpacity
//         style={styles.toggleBtn}
//         onPress={() => setShowStreetView(!showStreetView)}>
//         <Text style={styles.toggleBtnText}>
//           {showStreetView ? 'Show Map' : 'Show Street View'}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   map: {flex: 1},
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   toggleBtn: {
//     position: 'absolute',
//     bottom: 80,
//     alignSelf: 'center',
//     backgroundColor: '#000',
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     borderRadius: 12,
//   },
//   toggleBtnText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   arrowOverlay: {
//     position: 'absolute',
//     top: '45%',
//     left: '45%',
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//     borderRadius: 20,
//   },
//   arrow: {
//     fontSize: 24,
//     color: 'white',
//     fontWeight: 'bold',
//   },
// });

// export default ParkingMap1;
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapView, {Marker, AnimatedRegion} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import StreetView from 'react-native-streetview';
import {CAR} from '../assests/images';

const ParkingMap1 = () => {
  const mapRef = useRef(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [links, setLinks] = useState([]);
  console.log('linkslinks', links);

  const animatedCoord = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
  ).current;

  const [bearing, setBearing] = useState(0);
  const [targetCoord, setTargetCoord] = useState(null);

  // bearing calculate helper
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    lat1 = (lat1 * Math.PI) / 180;
    lat2 = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch(
          'https://techrepairtracker.base2brand.com/api/fetchGpsTracking',
        );
        const json = await response.json();

        if (json?.status && json?.data?.length > 0) {
          const latest = json.data[json.data.length - 1];
          const latitude = parseFloat(latest.lat);
          const longitude = parseFloat(latest.long);

          if (!isNaN(latitude) && !isNaN(longitude)) {
            if (!initialRegion) {
              setInitialRegion({
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
              animatedCoord.setValue({latitude, longitude});
            }

            // Target 500m ahead
            const target = {
              latitude: latitude + 0.0045, // approx 500m north
              longitude,
            };
            setTargetCoord(target);

            if (target) {
              const brng = calculateBearing(
                latitude,
                longitude,
                target.latitude,
                target.longitude,
              );
              setBearing(brng);
            }
          }
        }
      } catch (error) {
        console.error('GPS Fetch Error:', error);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 2000);
    return () => clearInterval(interval);
  }, [initialRegion]);

  if (!initialRegion) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      {showStreetView ? (
        <View style={{flex: 1}}>
          <StreetView
            style={styles.map}
            allGesturesEnabled={true}
            coordinate={{
              latitude: animatedCoord.__getValue().latitude,
              longitude: animatedCoord.__getValue().longitude,
            }}
            pov={{
              tilt: 0,
              bearing: bearing,
              zoom: 1,
            }}
            onPanoramaChange={event => {
              const {nativeEvent} = event;
              console.log('nativeEvent:::', nativeEvent);

              if (nativeEvent?.position) {
                const {latitude, longitude} = nativeEvent.position;
                animatedCoord
                  .timing({
                    latitude,
                    longitude,
                    duration: 800,
                    useNativeDriver: false,
                  })
                  .start();
              }
              if (nativeEvent?.links) {
                setLinks(nativeEvent.links);
                console.log('Available links (arrows):', nativeEvent.links);
              }
            }}
          />

          {/* Mini Map Overlay */}
          <TouchableOpacity
            onPress={() => setShowStreetView(false)}
            style={styles.miniMapContainer}>
            <MapView
              style={styles.miniMap}
              region={{
                latitude: animatedCoord.__getValue().latitude,
                longitude: animatedCoord.__getValue().longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              pointerEvents="none" // disable touch
            >
              <Marker.Animated coordinate={animatedCoord}>
                <Image
                  source={CAR}
                  style={{height: 20, width: 20}}
                  resizeMode="contain"
                />
              </Marker.Animated>

              {targetCoord && (
                <MapViewDirections
                  origin={{
                    latitude: animatedCoord.__getValue().latitude,
                    longitude: animatedCoord.__getValue().longitude,
                  }}
                  destination={targetCoord}
                  apikey={GOOGLE_MAPS_APIKEY}
                  strokeWidth={3}
                  strokeColor="blue"
                  mode="DRIVING"
                />
              )}
            </MapView>
          </TouchableOpacity>
        </View>
      ) : (
        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
          <Marker.Animated coordinate={animatedCoord}>
            <Image
              source={CAR}
              style={{height: 30, width: 30}}
              resizeMode="contain"
            />
          </Marker.Animated>

          {targetCoord && (
            <MapViewDirections
              origin={{
                latitude: animatedCoord.__getValue().latitude,
                longitude: animatedCoord.__getValue().longitude,
              }}
              destination={targetCoord}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="blue"
              mode="DRIVING"
              onReady={result => {
                if (result.coordinates.length > 1) {
                  const start = result.coordinates[0];
                  const next = result.coordinates[1];
                  const brng = calculateBearing(
                    start.latitude,
                    start.longitude,
                    next.latitude,
                    next.longitude,
                  );
                  setBearing(brng);
                }
              }}
            />
          )}
        </MapView>
      )}

      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setShowStreetView(!showStreetView)}>
        <Text style={styles.toggleBtnText}>
          {showStreetView ? 'Show Map' : 'Show Street View'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {flex: 1},
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtn: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  miniMapContainer: {
    position: 'absolute',
    top: 20,
    right: 10,
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
    elevation: 6,
  },
  miniMap: {
    flex: 1,
  },
});

export default ParkingMap1;
