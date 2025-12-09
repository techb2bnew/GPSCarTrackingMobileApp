const GOOGLE_MAPS_APIKEY = 'AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI'; // 👈 Add your API Key

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Text,
} from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAR } from '../assests/images';
// import SENSECAP_AUTH from '../constants/Constants'
import { io } from "socket.io-client";   // 👈 import socket
const SOCKET_URL = "https://gps.prorevv.com";
import mqtt from "mqtt/dist/mqtt"; // 👈 important for RN


const ParkingMap1 = () => {
  const mapRef = useRef(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [carLocation, setCarLocation] = useState(null);
  const [lastUpdatedTs, setLastUpdatedTs] = useState(null);
  const [timeTick, setTimeTick] = useState(0); // rerender timer for "time ago"
  console.log('initialRegioninitialRegion', initialRegion);

  // Animated coordinates
  const animatedCoord = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
  ).current;

  // 🚗 Smooth update for car
  const updateCarPosition = (latitude, longitude) => {
    animatedCoord
      .timing({
        latitude,
        longitude,
        duration: 2000,
        useNativeDriver: false,
      })
      .start();

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.0008,
          longitudeDelta: 0.0008,
        },
        1000,
      );
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS case
  };



  useEffect(() => {
    // 🔹 Load cached last car location for instant route
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('lastCarLocation');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.coords?.latitude && parsed?.coords?.longitude) {
            setCarLocation(parsed.coords);
            if (parsed?.timestamp) {
              setLastUpdatedTs(parsed.timestamp);
            }
            if (!initialRegion) {
              const region = {
                latitude: parsed.coords.latitude,
                longitude: parsed.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setInitialRegion(region);
              animatedCoord.setValue(parsed.coords);
            }
          }
        }
      } catch (e) {
        console.log('Cache load error:', e);
      }
    })();
    // MQTT client setup
    const client = mqtt.connect("ws://sensecap-openstream.seeed.cc:8083/mqtt", {
      username: "org-449810146246400",
      password: "9B1C6913197A4C56B5EC31F1CEBAECF9E7C7235B015B456DB0EC577BD7C167F3",
      clientId:
        "org-449810146246400-react-" +
        Math.random().toString(16).substr(2, 8),
      protocolVersion: 4,
    });

    let latestLat = null;
    let latestLon = null;

    client.on("connect", () => {
      console.log("✅ Connected to MQTT");

      // Subscribe longitude (4197) + latitude (4198)
      client.subscribe("/device_sensor_data/449810146246400/+/+/vs/4197");
      client.subscribe("/device_sensor_data/449810146246400/+/+/vs/4198");
    });

    client.on("message", (topic, message) => {
      const payload = JSON.parse(message.toString());

      if (topic.includes("4197")) {
        latestLon = payload.value;   // ✅ longitude
      } else if (topic.includes("4198")) {
        latestLat = payload.value;   // ✅ latitude
      }

      // Jab dono aa jaye tab update
      if (latestLat !== null && latestLon !== null) {
        const latitude = parseFloat(latestLat);
        const longitude = parseFloat(latestLon);
        console.log("📡 MQTT GPS:", latitude, longitude);

          if (!isNaN(latitude) && !isNaN(longitude)) {
          const nextCoords = { latitude, longitude };
          setCarLocation(nextCoords);
          // save cache
          AsyncStorage.setItem('lastCarLocation', JSON.stringify({ coords: nextCoords, timestamp: Date.now() })).catch(()=>{});
          setLastUpdatedTs(Date.now());

          if (!initialRegion) {
            const region = {
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setInitialRegion(region);
            animatedCoord.setValue({ latitude, longitude });
          } else {
            updateCarPosition(latitude, longitude);
          }
        }
      }
    });

    return () => {
      client.end();
    };
  }, []);

  // ⏱️ Update a tick every 30s to refresh the "time ago" label
  useEffect(() => {
    const id = setInterval(() => setTimeTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const getTimeAgo = (ts) => {
    if (!ts) return '';
    const diffMs = Date.now() - ts;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return '1 hr ago';
    return `${diffHr} hrs ago`;
  };



  // 🔹 Get current device location
  useEffect(() => {
    let watchId = null;

    const getLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        console.log('❌ Location permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setCurrentLocation({ latitude, longitude });
          console.log('✅ Current Location:', latitude, longitude);
        },
        error => {
          console.log('❌ Location Error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000, // 👈 30 sec
          maximumAge: 10000,
        },
      );

      // 🔁 Live location updates
      watchId = Geolocation.watchPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setCurrentLocation({ latitude, longitude });
        },
        error => {
          console.log('❌ WatchPosition Error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 1, // meters
          interval: 2000,
          fastestInterval: 1000,
          showsBackgroundLocationIndicator: false,
        },
      );
    };

    getLocation();

    // cleanup
    return () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  if (!initialRegion) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        mapType="standard"
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
      >
        {/* 🚗 Car Marker with Tooltip */}
        <Marker.Animated coordinate={animatedCoord}>
          <View style={styles.markerContainer}>
            {/* Tooltip */}
            {lastUpdatedTs && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>Last updated: {getTimeAgo(lastUpdatedTs)}</Text>
                <View style={styles.tooltipArrow} />
              </View>
            )}
            {/* Car Icon */}
            <Image
              source={CAR}
              style={{ height: 40, width: 40 }}
              resizeMode="contain"
            />
          </View>
        </Marker.Animated>

        {/* 📍 Directions from user → car */}
        {currentLocation && carLocation && (
          <MapViewDirections
            origin={currentLocation}
            destination={carLocation}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor="red"
            resetOnChange={true}
            onReady={result => {
              mapRef.current.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              });
            }}
          />
        )}
      </MapView>

    </View>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 5,
    position: 'relative',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.8)',
  },
});

export default ParkingMap1;

// import React, { useEffect, useRef, useState } from 'react';
// import {
//   View,
//   StyleSheet,
//   ActivityIndicator,
//   PermissionsAndroid,
//   Platform,
//   Text,
//   TouchableOpacity,
// } from 'react-native';
// import MapView, { Marker } from 'react-native-maps';
// import Geolocation from '@react-native-community/geolocation';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import mqtt from 'mqtt/dist/mqtt';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { getActiveChips } from '../utils/chipManager';

// const GOOGLE_MAPS_APIKEY = 'AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI';

// const ParkingMap1 = () => {
//   const mapRef = useRef(null);
//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [activeChips, setActiveChips] = useState([]);
//   const [carLocations, setCarLocations] = useState({}); // { chipId: { latitude, longitude, lastUpdate } }
//   const [mqttClient, setMqttClient] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [locationPermission, setLocationPermission] = useState(false);

//   // MQTT Configuration
//   const MQTT_CONFIG = {
//     host: "ws://sensecap-openstream.seeed.cc:8083/mqtt",
//     username: "org-449810146246400",
//     password: "9B1C6913197A4C56B5EC31F1CEBAECF9E7C7235B015B456DB0EC577BD7C167F3",
//     clientId: "org-449810146246400-react-" + Math.random().toString(16).substr(2, 8),
//     protocolVersion: 4,
//   };

//   // Request location permission
//   const requestLocationPermission = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//         );
//         if (granted === PermissionsAndroid.RESULTS.GRANTED) {
//           setLocationPermission(true);
//           return true;
//         }
//         return false;
//       } catch (err) {
//         console.warn(err);
//         return false;
//       }
//     } else {
//       setLocationPermission(true);
//       return true;
//     }
//   };

//   // Get current location
//   const getCurrentLocation = () => {
//     Geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude } = position.coords;
//         setCurrentLocation({ latitude, longitude });
//         console.log('📍 Current location:', latitude, longitude);
//       },
//       (error) => {
//         console.log('Location error:', error);
//       },
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
//     );
//   };

//   // Load saved chip location from AsyncStorage
//   const loadChipLocation = async (chipId) => {
//     try {
//       const saved = await AsyncStorage.getItem(`chip_${chipId}`);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         console.log(`📍 Loaded saved location for chip ${chipId}:`, parsed);
//         return parsed;
//       }
//     } catch (error) {
//       console.error('Error loading chip location:', error);
//     }
//     return null;
//   };

//   // Save chip location to AsyncStorage
//   const saveChipLocation = async (chipId, latitude, longitude) => {
//     try {
//       const chipData = {
//         latitude,
//         longitude,
//         timestamp: Date.now(),
//         lastUpdated: new Date().toISOString()
//       };
//       await AsyncStorage.setItem(`chip_${chipId}`, JSON.stringify(chipData));
//       console.log(`💾 Saved location for chip ${chipId}`);
//     } catch (error) {
//       console.error('Error saving chip location:', error);
//     }
//   };

//   // Load all active chips and their saved locations
//   const loadActiveChipsAndLocations = async () => {
//     try {
//       const chips = await getActiveChips();
//       setActiveChips(chips);
//       console.log(`🚗 Found ${chips.length} active chips`);

//       // Load saved locations for each chip
//       const locations = {};
//       for (const chip of chips) {
//         const savedLocation = await loadChipLocation(chip.chipId);
//         if (savedLocation) {
//           locations[chip.chipId] = {
//             latitude: savedLocation.latitude,
//             longitude: savedLocation.longitude,
//             lastUpdate: savedLocation.timestamp
//           };
//         }
//       }
//       setCarLocations(locations);
//       console.log(`📍 Loaded ${Object.keys(locations).length} saved locations`);
//     } catch (error) {
//       console.error('Error loading active chips:', error);
//     }
//   };

//   // Initialize MQTT for all active chips
//   const initializeMqtt = () => {
//     if (activeChips.length === 0) {
//       console.log('⚠️ No active chips to monitor');
//       return;
//     }

//     const client = mqtt.connect(MQTT_CONFIG.host, {
//       username: MQTT_CONFIG.username,
//       password: MQTT_CONFIG.password,
//       clientId: MQTT_CONFIG.clientId,
//       protocolVersion: MQTT_CONFIG.protocolVersion,
//     });

//     // Store partial lat/lon data for each chip
//     const latLongBuffer = {};

//     client.on("connect", () => {
//       console.log("✅ ParkingMap1: Connected to MQTT");

//       // Subscribe to lat/long topics for each active chip
//       activeChips.forEach(chip => {
//         const latitudeTopic = `/device_sensor_data/449810146246400/${chip.chipId}/+/vs/4198`;
//         const longitudeTopic = `/device_sensor_data/449810146246400/${chip.chipId}/+/vs/4197`;
        
//         console.log(`🔔 Subscribing to GPS topics for chip ${chip.chipId}`);
        
//         client.subscribe(latitudeTopic, (err) => {
//           if (!err) {
//             console.log(`✅ Subscribed to latitude topic: ${chip.chipId}`);
//           }
//         });
        
//         client.subscribe(longitudeTopic, (err) => {
//           if (!err) {
//             console.log(`✅ Subscribed to longitude topic: ${chip.chipId}`);
//           }
//         });
        
//         // Initialize buffer for this chip
//         latLongBuffer[chip.chipId] = { lat: null, lon: null };
//       });
//     });

//     client.on("message", async (topic, message) => {
//       try {
//         const payload = JSON.parse(message.toString());
        
//         // Extract chip ID from topic
//         // Topic format: /device_sensor_data/449810146246400/2CF7F1C07190019F/0/vs/4197
//         const topicParts = topic.split('/');
//         const chipId = topicParts[3];
        
//         // Initialize buffer if doesn't exist
//         if (!latLongBuffer[chipId]) {
//           latLongBuffer[chipId] = { lat: null, lon: null };
//         }
        
//         // Store latitude or longitude
//         if (topic.includes("4197")) {
//           latLongBuffer[chipId].lon = payload.value; // Longitude
//           console.log(`📡 Longitude received for ${chipId}: ${payload.value}`);
//         } else if (topic.includes("4198")) {
//           latLongBuffer[chipId].lat = payload.value; // Latitude
//           console.log(`📡 Latitude received for ${chipId}: ${payload.value}`);
//         }
        
//         // Update location when both lat & lon are available
//         const buffer = latLongBuffer[chipId];
//         if (buffer.lat !== null && buffer.lon !== null) {
//           const latitude = parseFloat(buffer.lat);
//           const longitude = parseFloat(buffer.lon);
          
//           if (!isNaN(latitude) && !isNaN(longitude)) {
//             console.log(`🚗 Complete location for ${chipId}:`, latitude, longitude);
            
//             // Update state
//             setCarLocations(prev => ({
//               ...prev,
//               [chipId]: {
//                 latitude,
//                 longitude,
//                 lastUpdate: Date.now()
//               }
//             }));
            
//             // Save to AsyncStorage
//             await saveChipLocation(chipId, latitude, longitude);
            
//             // Reset buffer
//             buffer.lat = null;
//             buffer.lon = null;
//           }
//         }
//       } catch (error) {
//         console.error('Error parsing MQTT message:', error);
//       }
//     });

//     client.on("error", (error) => {
//       console.error("MQTT Error:", error);
//     });

//     setMqttClient(client);
//   };

//   // Calculate map region to show all cars
//   const calculateMapRegion = () => {
//     const locations = [];
    
//     // Add current location
//     if (currentLocation) {
//       locations.push(currentLocation);
//     }
    
//     // Add all car locations
//     Object.values(carLocations).forEach(loc => {
//       if (loc?.latitude && loc?.longitude) {
//         locations.push(loc);
//       }
//     });
    
//     if (locations.length === 0) {
//       return {
//         latitude: 30.713452,
//         longitude: 76.691131,
//         latitudeDelta: 0.05,
//         longitudeDelta: 0.05,
//       };
//     }
    
//     if (locations.length === 1) {
//       return {
//         ...locations[0],
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01,
//       };
//     }
    
//     // Calculate bounds for all locations
//     const lats = locations.map(l => l.latitude);
//     const lons = locations.map(l => l.longitude);
    
//     const minLat = Math.min(...lats);
//     const maxLat = Math.max(...lats);
//     const minLon = Math.min(...lons);
//     const maxLon = Math.max(...lons);
    
//     const latDelta = (maxLat - minLat) * 1.5; // 50% padding
//     const lonDelta = (maxLon - minLon) * 1.5;
    
//     return {
//       latitude: (minLat + maxLat) / 2,
//       longitude: (minLon + maxLon) / 2,
//       latitudeDelta: Math.max(latDelta, 0.01),
//       longitudeDelta: Math.max(lonDelta, 0.01),
//     };
//   };

//   // Fit map to show all markers
//   const fitMapToMarkers = () => {
//     if (mapRef.current) {
//       const region = calculateMapRegion();
//       mapRef.current.animateToRegion(region, 1000);
//     }
//   };

//   // Initialize on mount
//   useEffect(() => {
//     const initialize = async () => {
//       // Request location permission
//       const hasPermission = await requestLocationPermission();
//       if (hasPermission) {
//         getCurrentLocation();
//       }
      
//       // Load active chips and their locations
//       await loadActiveChipsAndLocations();
      
//       setIsLoading(false);
//     };
    
//     initialize();
    
//     // Update current location every 30 seconds
//     const locationInterval = setInterval(() => {
//       if (locationPermission) {
//         getCurrentLocation();
//       }
//     }, 30000);
    
//     return () => clearInterval(locationInterval);
//   }, []);

//   // Initialize MQTT when active chips are loaded
//   useEffect(() => {
//     if (activeChips.length > 0) {
//       initializeMqtt();
//     }
    
//     return () => {
//       if (mqttClient) {
//         console.log('Disconnecting MQTT from ParkingMap1...');
//         mqttClient.end();
//       }
//     };
//   }, [activeChips]);

//   // Fit map when locations change
//   useEffect(() => {
//     if (Object.keys(carLocations).length > 0 || currentLocation) {
//       // Small delay to ensure markers are rendered
//       setTimeout(() => {
//         fitMapToMarkers();
//       }, 500);
//     }
//   }, [carLocations, currentLocation]);

//   if (isLoading) {
//     return (
//       <View style={multiVehicleStyles.loadingContainer}>
//         <ActivityIndicator size="large" color="#003F65" />
//         <Text style={multiVehicleStyles.loadingText}>Loading map...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={multiVehicleStyles.container}>
//       <MapView
//         ref={mapRef}
//         style={multiVehicleStyles.map}
//         mapType="standard"
//         showsUserLocation={true}
//         showsMyLocationButton={true}
//         initialRegion={{
//           latitude: currentLocation?.latitude || 30.713452,
//           longitude: currentLocation?.longitude || 76.691131,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         }}
//       >
//         {/* Current User Location Marker */}
//         {currentLocation && (
//           <Marker
//             coordinate={currentLocation}
//             title="Your Location"
//             description="Current position"
//           >
//             <View style={multiVehicleStyles.currentLocationMarker}>
//               <Ionicons name="person" size={20} color="#fff" />
//             </View>
//           </Marker>
//         )}

//         {/* All Active Chips Vehicle Markers */}
//         {activeChips.map((chip) => {
//           const location = carLocations[chip.chipId];
          
//           // Skip if no location data
//           if (!location?.latitude || !location?.longitude) {
//             return null;
//           }
          
//           return (
//             <Marker
//               key={chip.chipId}
//               coordinate={{
//                 latitude: location.latitude,
//                 longitude: location.longitude
//               }}
//               title={chip.vin}
//               description={`${chip.year} ${chip.make} ${chip.model}`}
//             >
//               <View style={multiVehicleStyles.carMarkerContainer}>
//                 <View style={multiVehicleStyles.tooltip}>
//                   <Text style={multiVehicleStyles.tooltipText}>
//                     {chip.make} {chip.model}
//                   </Text>
//                   <Text style={multiVehicleStyles.tooltipSubtext}>{chip.vin}</Text>
//                 </View>
                
//                 <View style={multiVehicleStyles.carLocationMarker}>
//                   <Ionicons name="car" size={20} color="#fff" />
//                 </View>
//               </View>
//             </Marker>
//           );
//         })}
//       </MapView>

//       {/* Stats Overlay */}
//       <View style={multiVehicleStyles.statsOverlay}>
//         <View style={multiVehicleStyles.statItem}>
//           <Ionicons name="car" size={18} color="#003F65" />
//           <Text style={multiVehicleStyles.statText}>
//             {Object.keys(carLocations).length}/{activeChips.length} tracked
//           </Text>
//         </View>
        
//         <TouchableOpacity
//           style={multiVehicleStyles.fitButton}
//           onPress={fitMapToMarkers}
//         >
//           <Ionicons name="expand" size={20} color="#003F65" />
//         </TouchableOpacity>
//       </View>

//       {/* Refresh Button */}
//       <TouchableOpacity
//         style={multiVehicleStyles.refreshButton}
//         onPress={() => {
//           console.log('🔄 Manual refresh locations');
//           loadActiveChipsAndLocations();
//         }}
//       >
//         <Ionicons name="refresh" size={24} color="#003F65" />
//       </TouchableOpacity>
//     </View>
//   );
// };

// const multiVehicleStyles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   map: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#666',
//   },
//   currentLocationMarker: {
//     backgroundColor: '#003F65',
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#003F65',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.4,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   carMarkerContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tooltip: {
//     backgroundColor: 'rgba(0,0,0,0.85)',
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 8,
//     marginBottom: 8,
//     minWidth: 120,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   tooltipText: {
//     color: '#fff',
//     fontSize: 11,
//     fontWeight: '700',
//     textAlign: 'center',
//     marginBottom: 2,
//   },
//   tooltipSubtext: {
//     color: '#fff',
//     fontSize: 9,
//     opacity: 0.8,
//     textAlign: 'center',
//     fontFamily: 'monospace',
//   },
//   carLocationMarker: {
//     backgroundColor: '#FF6B6B',
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#FF6B6B',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.4,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   statsOverlay: {
//     position: 'absolute',
//     top: 16,
//     left: 16,
//     right: 16,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   statItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.95)',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   statText: {
//     marginLeft: 6,
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#333',
//   },
//   fitButton: {
//     backgroundColor: 'rgba(255, 255, 255, 0.95)',
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   refreshButton: {
//     position: 'absolute',
//     bottom: 80,
//     right: 16,
//     backgroundColor: 'rgba(255, 255, 255, 0.95)',
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#003F65',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
// });

// // Uncomment below line to use multi-vehicle map
// export default ParkingMap1;

