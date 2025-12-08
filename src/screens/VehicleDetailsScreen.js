// import React, { useState, useEffect, useRef } from 'react';
// import { useFocusEffect } from '@react-navigation/native';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   PermissionsAndroid,
//   Platform,
//   Modal,
//   Animated,
// } from 'react-native';
// import MapView, { Marker, Polyline } from 'react-native-maps';
// import MapViewDirections from 'react-native-maps-directions';
// import Geolocation from '@react-native-community/geolocation';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import haversine from 'haversine-distance';
// import mqtt from "mqtt/dist/mqtt"; // 👈 important for RN
// import { spacings, style } from '../constants/Fonts';
// import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor, orangeColor, lightOrangeColor } from '../constants/Color';
// import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
// import { BaseStyle } from '../constants/Style';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { addActiveChip, moveChipToInactive, moveChipToActive, removeInactiveChip } from '../utils/chipManager';
// import { supabase } from '../lib/supabaseClient';
// import { checkChipOnlineStatus } from '../utils/chipStatusAPI';
// import { getMQTTConfig } from '../constants/Constants';
// import Toast from 'react-native-simple-toast';
// import { useSelector } from 'react-redux';
// import { requestLocationPermission, checkLocationPermission, shouldRequestPermission } from '../utils/locationPermission';
// import CompassHeading from 'react-native-compass-heading';

// const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

// const { width, height } = Dimensions.get('window');

// const VehicleDetailsScreen = ({ navigation, route }) => {
//   const { vehicle: initialVehicle, yardName, yardId } = route?.params || {};
//   const [vehicle, setVehicle] = useState(initialVehicle);

//   // Get current user from Redux store
//   const userData = useSelector(state => state.user.userData);
//   const mapRef = useRef(null);
//   const mqttLocationCallbackRef = useRef(null); // For refresh button MQTT callback
//   const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

//   // Location states
//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [chipLocation, setChipLocation] = useState(null);
//   const [carLocation, setCarLocation] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [locationPermission, setLocationPermission] = useState(false);
//   const [distanceToCar, setDistanceToCar] = useState(null);
//   const [lastUpdateTime, setLastUpdateTime] = useState(null);

//   // MQTT states
//   const [mqttClient, setMqttClient] = useState(null);
//   const [mqttConnected, setMqttConnected] = useState(false);
//   const [mqttDataReceived, setMqttDataReceived] = useState(false);

//   // Saved location states
//   const [savedLocation, setSavedLocation] = useState(null);
//   const [timeAgo, setTimeAgo] = useState('');

//   // Duplicate validation states
//   const [showDuplicateModal, setShowDuplicateModal] = useState(false);
//   const [duplicateInfo, setDuplicateInfo] = useState(null);

//   // History states
//   const [chipHistory, setChipHistory] = useState([]);

//   // Current location visibility state - show user icon when clicked
//   const [showUserIcon, setShowUserIcon] = useState(false);

//   // Arrow rotation - will point to car location
//   const arrowRotation = useRef(new Animated.Value(0)).current;

//   // Device heading from compass
//   const [deviceHeading, setDeviceHeading] = useState(0);

//   // Bearing to car (for compass box display)
//   const [bearingToCar, setBearingToCar] = useState(0);

//   // Remove mock data - will use real MQTT data


//   // Get chip ID from vehicle data (device ID)
//   const getChipId = () => {
//     return vehicle?.chip || vehicle?.chipId; // Support both chip and chipId fields
//   };

//   // Get current user info for history
//   const getCurrentUser = () => {
//     try {
//       if (userData) {
//         console.log("📚 [HISTORY] User data:", userData);

//         return {
//           name: userData?.name || userData?.email || 'Admin User',
//           email: userData?.email || 'admin@example.com'
//         };
//       }

//     } catch (error) {
//       console.error('Error getting user data:', error);
//     }
//   };

//   // Add entry to chip history
//   const addToHistory = async (action, chipId, notes) => {
//     try {
//       console.log(`📚 [HISTORY] Adding ${action} entry for chip: ${chipId}`);

//       const user = getCurrentUser();
//       const newEntry = {
//         action,
//         chip_id: chipId,
//         vin: vehicle?.vin,
//         timestamp: new Date().toISOString(),
//         user_name: user.name,
//         user_email: user.email,
//         notes
//       };

//       // Get current history from database
//       const { data: currentData, error: fetchError } = await supabase
//         .from('cars')
//         .select('history')
//         .eq('id', vehicle.id)
//         .single();

//       if (fetchError) {
//         console.error('📚 [HISTORY] Error fetching current history:', fetchError);
//         return;
//       }

//       // Parse existing history or create new array
//       const existingHistory = currentData?.history || { chip_history: [] };
//       const historyArray = existingHistory.chip_history || [];

//       // Add new entry to the beginning of array (most recent first)
//       const updatedHistory = {
//         chip_history: [newEntry, ...historyArray]
//       };

//       // Update database with new history
//       const { error: updateError } = await supabase
//         .from('cars')
//         .update({ history: updatedHistory })
//         .eq('id', vehicle.id);

//       if (updateError) {
//         console.error('📚 [HISTORY] Error updating history in database:', updateError);
//       } else {
//         console.log('📚 [HISTORY] ✅ History updated successfully:', newEntry);
//         // Update local state
//         setChipHistory(updatedHistory.chip_history);
//       }
//     } catch (error) {
//       console.error('📚 [HISTORY] Error adding to history:', error);
//     }
//   };

//   // Load chip history from database
//   const loadChipHistory = async () => {
//     try {
//       if (!vehicle?.id) return;

//       console.log(`📚 [HISTORY] Loading history for vehicle: ${vehicle.vin}`);

//       const { data, error } = await supabase
//         .from('cars')
//         .select('history')
//         .eq('id', vehicle.id)
//         .single();

//       if (error) {
//         console.error('📚 [HISTORY] Error loading history:', error);
//         return;
//       }

//       if (data?.history?.chip_history) {
//         setChipHistory(data.history.chip_history);
//         console.log('📚 [HISTORY] ✅ History loaded:', data.history.chip_history.length, 'entries');
//       } else {
//         setChipHistory([]);
//         console.log('📚 [HISTORY] No history found for vehicle');
//       }
//     } catch (error) {
//       console.error('📚 [HISTORY] Error loading chip history:', error);
//     }
//   };

//   // Save chip location to AsyncStorage
//   const saveChipLocation = async (chipId, latitude, longitude, timestamp) => {
//     try {
//       const chipData = {
//         latitude,
//         longitude,
//         timestamp,
//         lastUpdated: new Date(timestamp).toLocaleTimeString()
//       };

//       await AsyncStorage.setItem(`chip_${chipId}`, JSON.stringify(chipData));
//       console.log(`Saved location for chip ${chipId}:`, chipData);
//     } catch (error) {
//       console.error('Error saving chip location:', error);
//     }
//   };

//   // Load saved chip location from AsyncStorage
//   const loadChipLocation = async (chipId) => {
//     try {
//       const saved = await AsyncStorage.getItem(`chip_${chipId}`);
//       if (saved) {
//         const parsed = JSON.parse(saved);
//         console.log(`Loaded saved location for chip ${chipId}:`, parsed);
//         return parsed;
//       }
//     } catch (error) {
//       console.error('Error loading chip location:', error);
//     }
//     return null;
//   };

//   // Helper function to parse database timestamp to UTC milliseconds
//   // Database stores timestamps in UTC format (without Z suffix)
//   const parseDatabaseTimestamp = (dbTimestamp) => {
//     if (!dbTimestamp) return Date.now();

//     try {
//       // Database format: "2025-11-12T15:01:07.838" (UTC format, without Z)
//       // Or: "2025-11-12 15:01:07.838" (with space)
//       // Or: "2025-11-12T15:03:08.142Z" (with Z, already UTC)

//       // If timestamp ends with Z, it's already UTC
//       if (dbTimestamp.endsWith('Z')) {
//         return new Date(dbTimestamp).getTime();
//       }

//       // Normalize format: replace space with T if needed
//       const timestampStr = dbTimestamp.includes('T') ? dbTimestamp : dbTimestamp.replace(' ', 'T');

//       // Add Z to make it explicit UTC, or parse directly as UTC
//       // Database timestamp is already in UTC format, just parse it directly
//       const utcTimestamp = new Date(timestampStr + 'Z').getTime();

//       // Debug log
//       console.log('🔍 [PARSE TIMESTAMP]');
//       console.log(`   Input: ${dbTimestamp}`);
//       console.log(`   Normalized: ${timestampStr}Z`);
//       console.log(`   UTC Timestamp MS: ${utcTimestamp}`);
//       console.log(`   UTC Time: ${new Date(utcTimestamp).toISOString()}`);

//       return utcTimestamp;
//     } catch (error) {
//       console.error('Error parsing database timestamp:', error);
//       // Fallback to simple parsing
//       return new Date(dbTimestamp).getTime();
//     }
//   };

//   // Calculate time ago from timestamp
//   const getTimeAgo = (timestamp) => {
//     const now = Date.now();
//     const diffMs = now - timestamp;

//     const diffSec = Math.floor(diffMs / 1000);
//     const diffMin = Math.floor(diffSec / 60);
//     const diffHour = Math.floor(diffMin / 60);
//     const diffDay = Math.floor(diffHour / 24);

//     if (diffSec < 60) return `${diffSec}s ago`;
//     if (diffMin < 60) return `${diffMin}m ago`;
//     if (diffHour < 24) return `${diffHour}h ago`;
//     return `${diffDay}d ago`;
//   };

//   // Function to get yard name from facility ID
//   const getYardNameFromId = async (facilityId) => {
//     try {
//       if (!facilityId || facilityId === 'Unknown') return 'Unknown Yard';

//       // Get yard name from facility table
//       const { data: facilityData, error } = await supabase
//         .from('facility')
//         .select('name')
//         .eq('id', facilityId)
//         .single();

//       if (error || !facilityData) {
//         console.log(`⚠️ Yard name not found for ID: ${facilityId}`);
//         return `Yard ${facilityId}`; // Fallback with ID
//       }

//       return facilityData.name;
//     } catch (error) {
//       console.error('❌ Error fetching yard name:', error);
//       return `Yard ${facilityId}`; // Fallback with ID
//     }
//   };

//   // Check if chip already exists in Supabase (case-insensitive)
//   const checkChipExists = async (chipId) => {
//     try {
//       console.log(`🔍 Checking chip ${chipId} in Supabase...`);

//       // Check in Supabase using case-insensitive search
//       const { data, error } = await supabase
//         .from('cars')
//         .select('id, chip, vin, facilityId, make, model')
//         .ilike('chip', chipId)
//         .not('chip', 'is', null); // Only get vehicles that have a chip assigned

//       if (error) {
//         console.error('❌ Error checking chip in Supabase:', error);
//         return { exists: false };
//       }

//       if (data && data.length > 0) {
//         const foundVehicle = data[0];
//         console.log(`❌ Chip ${chipId} already exists in facility: ${foundVehicle.facilityId}`);

//         // Get yard name from facility ID
//         const yardName = await getYardNameFromId(foundVehicle.facilityId);

//         return {
//           exists: true,
//           vehicle: {
//             id: foundVehicle.id,
//             vin: foundVehicle.vin,
//             chipId: foundVehicle.chip,
//             make: foundVehicle.make,
//             model: foundVehicle.model
//           },
//           yardName: yardName
//         };
//       }

//       console.log(`✅ Chip ${chipId} is available`);
//       return { exists: false };
//     } catch (error) {
//       console.error('❌ Error checking chip exists:', error);
//       return { exists: false };
//     }
//   };


//   // Initialize MQTT connection (same as ParkingMap1 but with chip ID filtering)
//   const initializeMqtt = () => {
//     try {
//       console.log('Initializing MQTT for chip ID:', getChipId());

//       const MQTT_CONFIG = getMQTTConfig('react');
//       const client = mqtt.connect(MQTT_CONFIG.host, {
//         username: MQTT_CONFIG.username,
//         password: MQTT_CONFIG.password,
//         clientId: MQTT_CONFIG.clientId,
//         protocolVersion: MQTT_CONFIG.protocolVersion,
//       });

//       let latestLat = null;
//       let latestLon = null;
//       const targetChipId = getChipId();

//       client.on("connect", () => {
//         console.log("✅ Connected to MQTT for chip:", targetChipId);
//         setMqttConnected(true);

//         // Subscribe to specific chip ID topics (like mosquitto_sub command)
//         const latitudeTopic = `/device_sensor_data/449810146246400/${targetChipId}/+/vs/4198`;
//         const longitudeTopic = `/device_sensor_data/449810146246400/${targetChipId}/+/vs/4197`;

//         console.log("Subscribing to topics:");
//         console.log("Latitude topic:", latitudeTopic);
//         console.log("Longitude topic:", longitudeTopic);

//         client.subscribe(latitudeTopic, (err) => {
//           if (err) {
//             console.error('MQTT Subscribe error (latitude):', err);
//           } else {
//             console.log(`✅ Subscribed to latitude topic: ${latitudeTopic}`);
//           }
//         });

//         client.subscribe(longitudeTopic, (err) => {
//           if (err) {
//             console.error('MQTT Subscribe error (longitude):', err);
//           } else {
//             console.log(`✅ Subscribed to longitude topic: ${longitudeTopic}`);
//           }
//         });
//       });

//       client.on("message", async (topic, message) => {
//         try {
//           const payload = JSON.parse(message.toString());

//           console.log('📍 [MQTT] 📨 Message received on topic:', topic);
//           console.log('📍 [MQTT] 📦 Message payload:', payload);

//           // Since we're subscribed to specific chip ID topics, all messages are for our target chip
//           if (topic.includes("4197")) {
//             latestLon = payload.value;   // longitude
//             console.log('📍 [MQTT] 🌐 Longitude received for chip', targetChipId, ':', latestLon);
//           } else if (topic.includes("4198")) {
//             latestLat = payload.value;   // latitude
//             console.log('📍 [MQTT] 🌍 Latitude received for chip', targetChipId, ':', latestLat);
//           }

//           // Update location when both coordinates are received
//           if (latestLat !== null && latestLon !== null) {
//             const latitude = parseFloat(latestLat);
//             const longitude = parseFloat(latestLon);
//             console.log("📍 [MQTT] 🎯 Complete GPS coordinates received for chip", targetChipId, ":", {
//               latitude,
//               longitude,
//               timestamp: new Date().toISOString()
//             });

//             if (!isNaN(latitude) && !isNaN(longitude)) {
//               const timestamp = Date.now();
//               const nextCoords = { latitude, longitude };

//               // Save to AsyncStorage with chip ID and timestamp (fallback)
//               await saveChipLocation(targetChipId, latitude, longitude, timestamp);

//               // Update database with new location
//               try {
//                 // Use current timestamp instead of MQTT timestamp to avoid timezone issues
//                 const currentTimestamp = new Date().toISOString();
//                 console.log(`📍 [MQTT] 🔄 Updating database with new location for chip: ${targetChipId}`, {
//                   latitude,
//                   longitude,
//                   mqttTimestamp: new Date(timestamp).toISOString(),
//                   currentTimestamp: currentTimestamp,
//                   localTime: new Date().toLocaleString()
//                 });

//                 const { error: updateError } = await supabase
//                   .from('cars')
//                   .update({
//                     latitude: latitude,
//                     longitude: longitude,
//                     last_location_update: currentTimestamp // Use current time instead of MQTT time
//                   })
//                   .eq('chip', targetChipId);

//                 if (updateError) {
//                   console.error('📍 [MQTT] ❌ Error updating location in database:', updateError);
//                 } else {
//                   console.log(`📍 [MQTT] ✅ Location updated in database successfully:`, {
//                     chipId: targetChipId,
//                     latitude,
//                     longitude,
//                     databaseTimestamp: currentTimestamp,
//                     localTime: new Date().toLocaleString(),
//                     timeAgo: 'Just now'
//                   });
//                 }
//               } catch (dbError) {
//                 console.error('📍 [MQTT] ❌ Database location update error:', dbError);
//               }

//               // Update saved location state with current timestamp
//               const currentTime = Date.now();
//               const updatedLocation = {
//                 latitude,
//                 longitude,
//                 timestamp: currentTime, // Use current time for UI
//                 lastUpdated: new Date(currentTime).toLocaleTimeString()
//               };
//               setSavedLocation(updatedLocation);

//               // Set both chip location and car location to same coordinates
//               setChipLocation(nextCoords);
//               setCarLocation(nextCoords);
//               setMqttDataReceived(true);

//               // Update last update time and timeAgo immediately
//               setLastUpdateTime(new Date().toLocaleTimeString());
//               setTimeAgo(getTimeAgo(currentTime)); // Update timeAgo immediately

//               console.log('📍 [MQTT] ✅ Location updated in UI successfully:', {
//                 chipId: targetChipId,
//                 coordinates: nextCoords,
//                 currentTime: new Date().toLocaleString(),
//                 timeAgo: 'Just now'
//               });

//               // If refresh button callback is waiting, trigger it
//               if (mqttLocationCallbackRef.current) {
//                 console.log('📍 [MQTT] 🔄 Triggering refresh callback with location:', nextCoords);
//                 mqttLocationCallbackRef.current(nextCoords);
//                 mqttLocationCallbackRef.current = null; // Clear callback after use
//               }

//               // Recalculate distance if current location is available
//               if (currentLocation) {
//                 const distance = calculateDistance(currentLocation, nextCoords);
//                 setDistanceToCar(distance);
//                 console.log('📏 [DISTANCE] Distance calculated:', distance, 'meters');
//               }

//               // Update map region to include new car location and current location
//               if (mapRef.current && currentLocation) {
//                 const region = calculateMapRegion(currentLocation, nextCoords);
//                 mapRef.current.animateToRegion(region, 1000);
//               } else if (mapRef.current) {
//                 // If current location not available, just center on car location
//                 mapRef.current.animateToRegion({
//                   latitude: nextCoords.latitude,
//                   longitude: nextCoords.longitude,
//                   latitudeDelta: 0.01,
//                   longitudeDelta: 0.01,
//                 }, 1000);
//               }

//               // Reset coordinates for next update
//               latestLat = null;
//               latestLon = null;
//             }
//           }
//         } catch (error) {
//           console.error('Error parsing MQTT message:', error);
//         }
//       });

//       client.on("error", (error) => {
//         console.error("MQTT Error:", error);
//         setMqttConnected(false);
//       });

//       client.on("close", () => {
//         console.log("MQTT Connection closed");
//         setMqttConnected(false);
//       });

//       setMqttClient(client);

//     } catch (error) {
//       console.error("MQTT Initialization error:", error);
//       setMqttConnected(false);
//     }
//   };

//   // Request location permission using utility
//   const requestLocationPermissionLocal = async () => {
//     const hasPermission = await checkLocationPermission();
//     if (hasPermission) {
//       setLocationPermission(true);
//       return true;
//     }

//     const shouldRequest = await shouldRequestPermission();
//     if (!shouldRequest) {
//       setLocationPermission(false);
//       return false;
//     }

//     const granted = await requestLocationPermission({
//       title: 'Location Permission',
//       message: 'This app needs access to your location to show your position on the map.',
//       onGranted: () => {
//         setLocationPermission(true);
//       },
//       onDenied: () => {
//         setLocationPermission(false);
//       },
//     });

//     setLocationPermission(granted);
//     return granted;
//   };

//   // Calculate bearing (angle) from current location to car location
//   const calculateBearing = (start, end) => {
//     if (!start || !end) return 0;

//     const startLat = start.latitude * Math.PI / 180;
//     const startLng = start.longitude * Math.PI / 180;
//     const endLat = end.latitude * Math.PI / 180;
//     const endLng = end.longitude * Math.PI / 180;

//     const dLng = endLng - startLng;

//     const y = Math.sin(dLng) * Math.cos(endLat);
//     const x = Math.cos(startLat) * Math.sin(endLat) -
//       Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

//     const bearing = Math.atan2(y, x);
//     const bearingDegrees = (bearing * 180 / Math.PI + 360) % 360;

//     return bearingDegrees;
//   };

//   // Normalize angle to -180 to 180 range
//   const normalizeAngle = (angle) => {
//     let a = angle;
//     while (a > 180) a -= 360;
//     while (a < -180) a += 360;
//     return a;
//   };

//   // Calculate distance between two points using Haversine formula
//   const calculateDistance = (point1, point2) => {
//     if (!point1 || !point2) return null;

//     try {
//       // Try using haversine-distance package
//       const distance = haversine(
//         { lat: point1.latitude, lng: point1.longitude },
//         { lat: point2.latitude, lng: point2.longitude }
//       );
//       const roundedDistance = Math.round(distance); // Distance in meters

//       // Console log for verification
//       console.log(`📏 [Distance Calculation]`);
//       console.log(`   Point 1 (Current): ${point1.latitude}, ${point1.longitude}`);
//       console.log(`   Point 2 (Car): ${point2.latitude}, ${point2.longitude}`);
//       console.log(`   Distance: ${roundedDistance} meters (${(roundedDistance / 1000).toFixed(2)} km)`);

//       return roundedDistance;
//     } catch (error) {
//       console.log('Haversine error, using manual calculation:', error);

//       // Fallback: Manual Haversine formula
//       const R = 6371e3; // Earth's radius in meters
//       const φ1 = point1.latitude * Math.PI / 180;
//       const φ2 = point2.latitude * Math.PI / 180;
//       const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
//       const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

//       const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//         Math.cos(φ1) * Math.cos(φ2) *
//         Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//       const distance = R * c; // Distance in meters
//       const roundedDistance = Math.round(distance);

//       // Console log for verification
//       console.log(`📏 [Distance Calculation - Manual]`);
//       console.log(`   Point 1 (Current): ${point1.latitude}, ${point1.longitude}`);
//       console.log(`   Point 2 (Car): ${point2.latitude}, ${point2.longitude}`);
//       console.log(`   Distance: ${roundedDistance} meters (${(roundedDistance / 1000).toFixed(2)} km)`);

//       return roundedDistance;
//     }
//   };

//   // Calculate optimal map region to show all locations
//   const calculateMapRegion = (currentLoc, carLoc) => {
//     if (!currentLoc || !carLoc) {
//       return {
//         latitude: currentLoc?.latitude || 30.713452,
//         longitude: currentLoc?.longitude || 76.691131,
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01,
//       };
//     }

//     // Calculate bounds to include both locations
//     const minLat = Math.min(currentLoc.latitude, carLoc.latitude);
//     const maxLat = Math.max(currentLoc.latitude, carLoc.latitude);
//     const minLng = Math.min(currentLoc.longitude, carLoc.longitude);
//     const maxLng = Math.max(currentLoc.longitude, carLoc.longitude);

//     // Add padding to the bounds
//     const latPadding = (maxLat - minLat) * 0.3; // 30% padding
//     const lngPadding = (maxLng - minLng) * 0.3;

//     const centerLat = (minLat + maxLat) / 2;
//     const centerLng = (minLng + maxLng) / 2;

//     // Ensure minimum delta values for better zoom
//     const latDelta = Math.max((maxLat - minLat) + latPadding, 0.005);
//     const lngDelta = Math.max((maxLng - minLng) + lngPadding, 0.005);

//     return {
//       latitude: centerLat,
//       longitude: centerLng,
//       latitudeDelta: latDelta,
//       longitudeDelta: lngDelta,
//     };
//   };


//   const getCurrentLocationAlternative = () => {
//     console.log('📍 [VEHICLE] Trying alternative location method...');

//     Geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude } = position.coords;
//         const newCurrentLocation = { latitude, longitude };
//         console.log('✅ [VEHICLE] Alternative location obtained:', { latitude, longitude });
//         setCurrentLocation(newCurrentLocation);

//         // Calculate distance to car if car location is available
//         if (carLocation) {
//           const distance = calculateDistance(newCurrentLocation, carLocation);
//           setDistanceToCar(distance);
//         }

//         setLastUpdateTime(new Date().toLocaleTimeString());
//         setIsLoading(false);

//         // Calculate optimal region and animate to it if car location is available
//         if (mapRef.current && carLocation) {
//           const region = calculateMapRegion(newCurrentLocation, carLocation);
//           mapRef.current.animateToRegion(region, 1500);
//         }
//       },
//       (error) => {
//         console.error('❌ [VEHICLE] Alternative location also failed:', error);
//         console.error('❌ [VEHICLE] Alternative error code:', error.code);

//         // Try one more time with even more relaxed settings
//         if (error.code === 3) { // Still timeout
//           console.log('🔄 [VEHICLE] Trying third attempt with very relaxed settings...');
//           getCurrentLocationThirdAttempt();
//         } else {
//           console.log('⚠️ [VEHICLE] Alternative location failed, stopping attempts');
//           setIsLoading(false);
//           setLastUpdateTime(new Date().toLocaleTimeString());
//         }
//       },
//       {
//         enableHighAccuracy: false, // Try with lower accuracy
//         timeout: 45000, // 45 seconds timeout
//         maximumAge: 300000, // 5 minutes old location is okay
//         distanceFilter: 100, // 100 meters filter
//       }
//     );
//   };
//   // Get current location
//   const getCurrentLocation = () => {
//     console.log('📍 [VEHICLE] Getting current location...');

//     Geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude } = position.coords;
//         const newCurrentLocation = { latitude, longitude };
//         console.log('✅ [VEHICLE] Current location obtained:', { latitude, longitude });
//         setCurrentLocation(newCurrentLocation);

//         // Set last update time
//         setLastUpdateTime(new Date().toLocaleTimeString());
//         setIsLoading(false);

//         // Distance calculation and map region update will be handled by useEffect
//         // when showCurrentLocation, currentLocation, or carLocation changes
//       },
//       (error) => {
//         console.error('❌ [VEHICLE] Error getting current location:', error);
//         console.error('❌ [VEHICLE] Error code:', error.code);
//         console.error('❌ [VEHICLE] Error message:', error.message);

//         // Handle different error types
//         if (error.code === 3) { // TIMEOUT
//           console.log('⏰ [VEHICLE] Location request timed out, trying alternative method...');
//           getCurrentLocationAlternative();
//         } else if (error.code === 1) { // PERMISSION_DENIED
//           console.log('🚫 [VEHICLE] Permission denied');
//           setLocationPermission(false);
//           setIsLoading(false);
//           setLastUpdateTime(new Date().toLocaleTimeString());
//           // Don't request again here, let the screen focus handler do it
//         } else if (Platform.OS === 'android') {
//           console.log('🔄 [VEHICLE] Trying alternative location method for Android...');
//           getCurrentLocationAlternative();
//         } else {
//           console.log('⚠️ [VEHICLE] Location failed on iOS');
//           setIsLoading(false);
//           setLocationPermission(false);
//           setLastUpdateTime(new Date().toLocaleTimeString());
//         }
//       },
//       {
//         enableHighAccuracy: false, // Start with lower accuracy for Android
//         timeout: Platform.OS === 'android' ? 30000 : 15000, // 30 seconds for Android
//         maximumAge: Platform.OS === 'android' ? 0 : 10000, // Always fresh for Android
//         distanceFilter: 0, // No distance filter
//       }
//     );
//   };



//   const getCurrentLocationThirdAttempt = () => {
//     console.log('📍 [VEHICLE] Third attempt with very relaxed settings...');

//     Geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude } = position.coords;
//         const newCurrentLocation = { latitude, longitude };
//         console.log('✅ [VEHICLE] Third attempt location obtained:', { latitude, longitude });
//         setCurrentLocation(newCurrentLocation);

//         // Calculate distance to car if car location is available
//         if (carLocation) {
//           const distance = calculateDistance(newCurrentLocation, carLocation);
//           setDistanceToCar(distance);
//         }

//         setLastUpdateTime(new Date().toLocaleTimeString());
//         setIsLoading(false);

//         // Calculate optimal region and animate to it if car location is available
//         if (mapRef.current && carLocation) {
//           const region = calculateMapRegion(newCurrentLocation, carLocation);
//           mapRef.current.animateToRegion(region, 1500);
//         }
//       },
//       (error) => {
//         console.error('❌ [VEHICLE] All location attempts failed:', error);
//         console.log('⚠️ [VEHICLE] All location attempts failed, stopping');
//         setIsLoading(false);
//         setLastUpdateTime(new Date().toLocaleTimeString());
//       },
//       {
//         enableHighAccuracy: false,
//         timeout: 60000, // 1 minute timeout
//         maximumAge: 600000, // 10 minutes old location is okay
//         distanceFilter: 500, // 500 meters filter
//       }
//     );
//   };

//   // Check chip online status from API when component loads or chipId changes
//   useEffect(() => {
//     const checkChipStatus = async () => {
//       const chipId = getChipId();
//       if (chipId) {
//         try {
//           console.log(`🔄 [VehicleDetails] Checking online status for chip: ${chipId}`);
//           const statusMap = await checkChipOnlineStatus([chipId]);
//           const chipStatus = statusMap[chipId];

//           if (chipStatus) {
//             const isActive = chipStatus.online_status === 1;
//             console.log(`✅ [VehicleDetails] Chip ${chipId} status: ${isActive ? 'Active' : 'Inactive'}`);

//             // Update vehicle state with actual status from API
//             setVehicle(prev => ({
//               ...prev,
//               isActive: isActive,
//               onlineStatus: chipStatus.online_status
//             }));
//           } else {
//             console.log(`⚠️ [VehicleDetails] No status returned for chip ${chipId}`);
//           }
//         } catch (error) {
//           console.error('❌ [VehicleDetails] Error checking chip status:', error);
//           // Keep existing status if API fails
//         }
//       }
//     };

//     checkChipStatus();
//   }, [vehicle?.chipId]);

//   // Initialize location tracking and MQTT
//   useEffect(() => {
//     const initializeLocation = async () => {
//       const chipId = getChipId();

//       // Only proceed if chip is assigned
//       if (chipId) {
//         // First, try to load location from database
//         try {
//           console.log(`📍 [INIT] Loading location from database for chip: ${chipId}`);
//           const { data: carData, error: dbError } = await supabase
//             .from('cars')
//             .select('latitude, longitude, last_location_update')
//             .eq('chip', chipId)
//             .single();

//           console.log(`📍 [DATABASE] Query result:`, { carData, dbError });

//           if (!dbError && carData && carData.latitude && carData.longitude) {
//             console.log('📍 [DATABASE] ✅ Location found in database:', {
//               latitude: carData.latitude,
//               longitude: carData.longitude,
//               last_update: carData.last_location_update
//             });
//             // Parse database timestamp (IST format) to UTC milliseconds
//             const timestamp = parseDatabaseTimestamp(carData.last_location_update);

//             // Console log for verification
//             console.log('🕐 [DATABASE TIMESTAMP]');
//             console.log(`   Raw from DB: ${carData.last_location_update}`);
//             console.log(`   Parsed UTC MS: ${timestamp}`);
//             console.log(`   UTC Time: ${new Date(timestamp).toISOString()}`);
//             console.log(`   Current Time MS: ${Date.now()}`);
//             console.log(`   Difference MS: ${Date.now() - timestamp}`);
//             console.log(`   Time Ago: ${getTimeAgo(timestamp)}`);

//             setSavedLocation({
//               latitude: carData.latitude,
//               longitude: carData.longitude,
//               timestamp: timestamp,
//               lastUpdated: new Date(timestamp).toLocaleTimeString()
//             });
//             setChipLocation({ latitude: carData.latitude, longitude: carData.longitude });
//             setCarLocation({ latitude: carData.latitude, longitude: carData.longitude });
//             setMqttDataReceived(true);
//             setTimeAgo(getTimeAgo(timestamp));
//             console.log('📍 [DATABASE] ✅ Location loaded successfully from database');
//           } else {
//             console.log('📍 [DATABASE] ❌ No location found in database, checking local storage...', {
//               hasData: !!carData,
//               hasLat: carData?.latitude,
//               hasLng: carData?.longitude,
//               error: dbError
//             });
//             // Fallback to local storage if no database location
//             const saved = await loadChipLocation(chipId);
//             if (saved) {
//               setSavedLocation(saved);
//               setChipLocation({ latitude: saved.latitude, longitude: saved.longitude });
//               setCarLocation({ latitude: saved.latitude, longitude: saved.longitude });
//               setMqttDataReceived(true);
//               setTimeAgo(getTimeAgo(saved.timestamp));
//               console.log('📍 [LOCAL] ✅ Loaded location from local storage:', saved);
//             } else {
//               console.log('📍 [LOCAL] ❌ No location found in local storage either');
//             }
//           }
//         } catch (error) {
//           console.error('📍 [ERROR] Database loading failed:', error);
//           // Fallback to local storage
//           const saved = await loadChipLocation(chipId);
//           if (saved) {
//             setSavedLocation(saved);
//             setChipLocation({ latitude: saved.latitude, longitude: saved.longitude });
//             setCarLocation({ latitude: saved.latitude, longitude: saved.longitude });
//             setMqttDataReceived(true);
//             setTimeAgo(getTimeAgo(saved.timestamp));
//             console.log('📍 [FALLBACK] ✅ Loaded location from local storage after database error');
//           } else {
//             console.log('📍 [FALLBACK] ❌ No location available anywhere');
//           }
//         }

//         // Initialize MQTT connection only if chip is assigned
//         initializeMqtt();

//         // Load chip history
//         loadChipHistory();
//       }

//       // Always set loading to false first so details can show
//       setIsLoading(false);
//       setLastUpdateTime(new Date().toLocaleTimeString());

//       // Automatically get current location when screen opens
//       const hasPermission = await checkLocationPermission();
//       if (hasPermission) {
//         setLocationPermission(true);
//         getCurrentLocation(); // Automatically fetch location
//       } else {
//         // Request permission if not already denied 3 times
//         requestLocationPermissionLocal().then((granted) => {
//           if (granted) {
//             getCurrentLocation(); // Fetch location after permission granted
//           }
//         });
//       }
//     };

//     initializeLocation();

//     return () => {
//       // Disconnect MQTT client on cleanup
//       if (mqttClient) {
//         console.log('Disconnecting MQTT client...');
//         mqttClient.end();
//         setMqttClient(null);
//         setMqttConnected(false);
//       }
//     };
//   }, []);

//   // Set up location updates every 30 seconds
//   useEffect(() => {
//     if (!locationPermission) {
//       return; // Don't set up interval if no permission
//     }

//     console.log('📍 [LOCATION INTERVAL] Setting up location updates every 30 seconds');

//     const locationInterval = setInterval(() => {
//       if (locationPermission) {
//         console.log('📍 [LOCATION INTERVAL] Updating current location...');
//         getCurrentLocation();
//       }
//     }, 30000); // 30 seconds

//     return () => {
//       console.log('📍 [LOCATION INTERVAL] Clearing location update interval');
//       clearInterval(locationInterval);
//     };
//   }, [locationPermission]);

//   // Setup compass heading listener
//   useEffect(() => {
//     const degree_update_rate = 3; // Update rate in degrees

//     CompassHeading.start(degree_update_rate, (heading) => {
//       // Ensure heading is a valid number
//       const headingValue = typeof heading === 'number' ? heading : (heading?.heading || 0);
//       if (!isNaN(headingValue) && isFinite(headingValue)) {
//         setDeviceHeading(headingValue);
//       }
//     });

//     return () => {
//       CompassHeading.stop();
//     };
//   }, []);

//   // Animate arrow rotation to always point to car location (iPhone Maps style - based on phone heading)
//   useEffect(() => {
//     if (!currentLocation || !carLocation) {
//       return;
//     }

//     // Ensure deviceHeading is a valid number
//     const heading = typeof deviceHeading === 'number' && !isNaN(deviceHeading) ? deviceHeading : 0;

//     // Calculate bearing from user location to car location (0-360 degrees, 0 = North)
//     const bearing = calculateBearing(currentLocation, carLocation);

//     // Store bearing for compass box display
//     setBearingToCar(bearing);

//     // Calculate rotation: (bearing - deviceHeading + 360) % 360
//     // This makes the arrow point to car relative to phone orientation (iPhone Maps style)
//     let rotation = (bearing - heading + 360) % 360;

//     // Animate arrow rotation to point to car
//     Animated.timing(arrowRotation, {
//       toValue: rotation,
//       duration: 200,
//       useNativeDriver: true,
//     }).start();

//     console.log('🧭 [ARROW] Arrow pointing to car (phone heading based):', {
//       bearing: bearing.toFixed(1) + '°',
//       deviceHeading: heading.toFixed(1) + '°',
//       rotation: rotation.toFixed(1) + '°',
//       userLocation: `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`,
//       carLocation: `${carLocation.latitude.toFixed(4)}, ${carLocation.longitude.toFixed(4)}`
//     });
//   }, [currentLocation, carLocation, deviceHeading]);

//   // Rotate map based on device heading (like phone rotates)
//   useEffect(() => {
//     if (!mapRef.current) {
//       return;
//     }

//     // Ensure deviceHeading is a valid number
//     const heading = typeof deviceHeading === 'number' && !isNaN(deviceHeading) ? deviceHeading : 0;

//     // Determine center point - prefer current location, fallback to car location
//     const centerLocation = currentLocation || carLocation;
//     if (!centerLocation) {
//       return;
//     }

//     // Update map camera with device heading to rotate map as phone rotates
//     try {
//       // Use animateToCamera for smooth rotation
//       mapRef.current.animateToCamera(
//         {
//           center: {
//             latitude: centerLocation.latitude,
//             longitude: centerLocation.longitude,
//           },
//           heading: heading, // Rotate map based on device heading
//           // pitch: 0,
//           // altitude: 1000,
//           // zoom: 15,
//         },
//         { duration: 150 } // Fast smooth rotation
//       );

//       console.log('🗺️ [MAP ROTATION] Map rotated to heading:', heading.toFixed(1) + '°');
//     } catch (error) {
//       console.log('🗺️ [MAP ROTATION] Error rotating map:', error);
//     }
//   }, [deviceHeading, currentLocation, carLocation]);

//   // Check permission when screen is focused
//   useFocusEffect(
//     React.useCallback(() => {
//       const checkPermissionOnFocus = async () => {
//         // Don't block UI - always show details
//         setIsLoading(false);

//         const hasPermission = await checkLocationPermission();
//         if (hasPermission) {
//           setLocationPermission(true);
//           // Automatically get location if not already fetched
//           if (!currentLocation) {
//             getCurrentLocation();
//           }
//         } else {
//           setLocationPermission(false);
//         }
//       };

//       checkPermissionOnFocus();
//     }, [])
//   );

//   // Handle current location marker click - show/hide user icon
//   const handleCurrentLocationMarkerClick = () => {
//     console.log('📍 [CURRENT LOCATION] Current location marker clicked');
//     setShowUserIcon(!showUserIcon);
//   };

//   // Handle refresh location button click
//   const handleRefreshLocation = async () => {
//     console.log('🔄 [REFRESH] Refresh location button clicked');

//     const chipId = getChipId();
//     if (!chipId) {
//       console.log('No chip assigned');
//       return;
//     }

//     setIsRefreshingLocation(true);
//     // Toast.show('Fetching location from MQTT...', Toast.SHORT);

//     try {
//       // Step 1: Pehle MQTT se fetch (30 seconds timeout)
//       console.log('📍 [REFRESH] Step 1: Fetching from MQTT...');

//       // Create promise to wait for MQTT location
//       const waitForMqttLocation = new Promise((resolve, reject) => {
//         // Set callback for when MQTT location is received
//         mqttLocationCallbackRef.current = (location) => {
//           resolve(location);
//         };

//         // Timeout after 15 seconds
//         setTimeout(() => {
//           if (mqttLocationCallbackRef.current) {
//             mqttLocationCallbackRef.current = null;
//             reject(new Error('MQTT timeout'));
//           }
//         }, 15000); // 15 seconds
//       });

//       // Disconnect existing MQTT if connected
//       if (mqttClient) {
//         console.log('📍 [REFRESH] Disconnecting existing MQTT connection...');
//         mqttClient.end();
//         setMqttClient(null);
//         setMqttConnected(false);
//       }

//       // Reconnect MQTT to get fresh data
//       console.log('📍 [REFRESH] Reconnecting MQTT to fetch location...');
//       initializeMqtt();

//       // Wait for MQTT location with timeout
//       try {
//         const location = await waitForMqttLocation;
//         console.log('📍 [REFRESH] ✅ Location received from MQTT:', location);
//         // Location already updated in MQTT message handler (UI + Database)
//         // Toast.show('Location refreshed from MQTT', Toast.SHORT);
//         setIsRefreshingLocation(false);
//         return;
//       } catch (error) {
//         console.log('📍 [REFRESH] ⏰ MQTT timeout, checking database...');

//         // Step 2: MQTT se nahi mila, database se fetch
//         console.log('📍 [REFRESH] Step 2: Fetching from database...');
//         // Toast.show('Checking database...', Toast.SHORT);

//         const { data: carData } = await supabase
//           .from('cars')
//           .select('latitude, longitude, last_location_update')
//           .eq('chip', chipId)
//           .single();

//         if (carData && carData.latitude && carData.longitude) {
//           // Parse database timestamp (IST format) to UTC milliseconds
//           const timestamp = parseDatabaseTimestamp(carData.last_location_update);

//           setSavedLocation({
//             latitude: carData.latitude,
//             longitude: carData.longitude,
//             timestamp: timestamp,
//             lastUpdated: new Date(timestamp).toLocaleTimeString()
//           });
//           setChipLocation({ latitude: carData.latitude, longitude: carData.longitude });
//           setCarLocation({ latitude: carData.latitude, longitude: carData.longitude });
//           setMqttDataReceived(true);
//           setTimeAgo(getTimeAgo(timestamp));
//           setLastUpdateTime(new Date().toLocaleTimeString()); // Update refresh time
//           // Toast.show('Location refreshed from database', Toast.SHORT);
//         } else {
//           // Toast.show('Location not available', Toast.SHORT);
//         }
//         setIsRefreshingLocation(false);
//       }
//     } catch (error) {
//       console.error('📍 [REFRESH] Error refreshing location:', error);
//       // Toast.show('Failed to refresh location', Toast.SHORT);
//       setIsRefreshingLocation(false);
//     }
//   };

//   // Real-time time ago updates (every 10 seconds for more frequent updates)
//   useEffect(() => {
//     if (savedLocation) {
//       // Update immediately
//       setTimeAgo(getTimeAgo(savedLocation.timestamp));

//       // Then update every 10 seconds
//       const interval = setInterval(() => {
//         if (savedLocation && savedLocation.timestamp) {
//           const updatedTime = getTimeAgo(savedLocation.timestamp);
//           setTimeAgo(updatedTime);
//         }
//       }, 10000); // 10 seconds for more frequent updates

//       return () => clearInterval(interval);
//     }
//   }, [savedLocation]);

//   // Calculate distance when both locations are available
//   useEffect(() => {
//     if (currentLocation && carLocation) {
//       const distance = calculateDistance(currentLocation, carLocation);
//       setDistanceToCar(distance);
//       console.log(`📏 [DISTANCE UPDATE] Distance to car: ${distance} meters`);
//     }
//   }, [currentLocation, carLocation]);

//   // Handle initial zoom when both locations are available
//   useEffect(() => {
//     if (currentLocation && carLocation && mapRef.current && !isLoading) {
//       // Small delay to ensure map is fully rendered
//       const timer = setTimeout(() => {
//         const region = calculateMapRegion(currentLocation, carLocation);
//         mapRef.current.animateToRegion(region, 1000);
//         console.log('🗺️ [MAP] Map region updated to show both locations');
//       }, 300);

//       return () => clearTimeout(timer);
//     } else if (carLocation && mapRef.current && !isLoading) {
//       // If current location not available, just center on car
//       const timer = setTimeout(() => {
//         mapRef.current.animateToRegion({
//           latitude: carLocation.latitude,
//           longitude: carLocation.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }, 1000);
//         console.log('🗺️ [MAP] Map region updated to show car location only');
//       }, 300);

//       return () => clearTimeout(timer);
//     }
//   }, [currentLocation, carLocation, isLoading]);

//   // Update vehicle with chip ID in Supabase
//   const updateVehicleWithChip = async (chipId) => {
//     try {
//       console.log(`🔄 Updating vehicle ${vehicle.vin} with chip: ${chipId || 'null (unassign)'}`);

//       // Update vehicle in Supabase
//       const { data, error } = await supabase
//         .from('cars')
//         .update({
//           chip: chipId // chipId can be a string or null
//         })
//         .eq('vin', vehicle.vin)
//         .select();

//       if (error) {
//         console.error('❌ Error updating vehicle in Supabase:', error);
//         Toast.show(`Failed to ${chipId ? 'assign' : 'unassign'} chip: ${error.message}`, Toast.LONG);
//         return;
//       }

//       console.log(`✅ Vehicle updated in Supabase:`, data);

//       // Update the local vehicle state to reflect the change
//       const updatedVehicle = {
//         ...vehicle,
//         chipId: chipId,
//         chip: chipId, // Keep both for compatibility
//         isActive: chipId ? true : false,
//         lastUpdated: new Date().toISOString()
//       };

//       // Update the vehicle state so the UI reflects the change immediately
//       setVehicle(updatedVehicle);

//       // Manage chip arrays
//       if (chipId) {
//         // First remove from inactive chips if exists, then add to active
//         await removeInactiveChip(chipId);

//         // Add to active chips array
//         await addActiveChip({
//           chipId: chipId,
//           vehicleId: vehicle.id,
//           vin: vehicle.vin,
//           make: vehicle.make,
//           model: vehicle.model,
//           yardId: yardId, // Send actual yard ID to backend
//           yardName: yardName || 'Unknown Yard' // Show yard name in UI
//         });
//         console.log(`✅ Chip ${chipId} assigned and added to active chips`);
//         Toast.show('✅ Chip assigned successfully!', Toast.LONG);
//       } else {
//         // Move to inactive chips array (when unassigning)
//         if (vehicle.chipId || vehicle.chip) {
//           const oldChipId = vehicle.chipId || vehicle.chip;
//           await moveChipToInactive(oldChipId);
//           console.log(`✅ Chip ${oldChipId} unassigned and moved to inactive chips`);
//         }
//         Toast.show('✅ Chip unassigned successfully!', Toast.LONG);
//       }

//     } catch (error) {
//       console.error('❌ Error updating vehicle with chip:', error);
//       Toast.show(`Failed to ${chipId ? 'assign' : 'unassign'} chip`, Toast.SHORT);
//     }
//   };

//   // Handle unassign chip
//   const handleUnassignChip = async () => {
//     try {
//       const chipId = vehicle?.chipId || vehicle?.chip;
//       Alert.alert(
//         'Unassign Chip',
//         `Are you sure you want to unassign this chip?\n\nChip ID: ${chipId}\n\nThe vehicle will become inactive.`,
//         [
//           {
//             text: 'No',
//             style: 'cancel',
//           },
//           {
//             text: 'Yes',
//             style: 'destructive',
//             onPress: async () => {
//               const chipId = vehicle?.chipId || vehicle?.chip;
//               await updateVehicleWithChip(null);
//               // Add to history
//               await addToHistory('unassigned', chipId, 'Chip unassigned successfully');
//             },
//           },
//         ]
//       );
//     } catch (error) {
//       console.error('Error unassigning chip:', error);
//     }
//   };

//   // Handle unassigned chip assignment
//   const handleAssignChip = async () => {
//     try {
//       // Import barcode scanner for chip scanning
//       const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

//       const config = {
//         license: 't0106HAEAAHzeSbXnzxTF1q/CibMNJ9Rs/d+Mr1go8Ei1Ca/DsVz7oHBgmTAqPAI1+Qm+mZuykTKpLGSMnYRSb7/O9fLWl9kAtwG6uNlxzb0WeKN3Tqp9nqNejm+eTuH8dyp9nW5WXF42iKU56Q==;t0109HAEAALVBi/VLPlWfzPA0RQBXzFhWyqtHKnUpwCzsrabGTAEfMsiO/36D/SvYGIPrZuRi2U6ptBwKu64cW9vsuRURDBtAXABOA0y1+Vija4Vf9Ix9hufnperXcc/VKZL/nfK7M81aKtsBi1857Q==',
//         scanningMode: EnumScanningMode.SM_SINGLE,
//       };

//       const result = await BarcodeScanner.launch(config);

//       if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
//         const fullText = result.barcodes[0].text;
//         const chipId = fullText.substring(0, 16);

//         // Check if chip already exists in any yard
//         const chipCheck = await checkChipExists(chipId);
//         if (chipCheck.exists) {
//           setDuplicateInfo({
//             type: 'chip',
//             value: chipId,
//             yardName: chipCheck.yardName,
//             vin: chipCheck.vehicle.vin,
//             vehicleId: chipCheck.vehicle.id // Store vehicle ID for unassigning
//           });
//           setShowDuplicateModal(true);
//           return;
//         }

//         // Update the vehicle with the new chip ID
//         await updateVehicleWithChip(chipId);

//         // Add to history
//         await addToHistory('assigned', chipId, 'Chip assigned successfully');
//       } else {
//         console.log('Info', 'Chip scanning cancelled');
//       }
//     } catch (error) {
//       console.error('Error scanning chip:', error);
//     }
//   };

//   // Handle unassigning chip from duplicate vehicle
//   const handleUnassignFromDuplicate = async () => {
//     try {
//       const chipId = duplicateInfo?.value;
//       Alert.alert(
//         'Unassign Chip',
//         `Are you sure you want to unassign this chip?\n\nChip ID: ${chipId}\nVIN: ${duplicateInfo?.vin}\nYard: ${duplicateInfo?.yardName}\n\nThe vehicle will become inactive.`,
//         [
//           {
//             text: 'No',
//             style: 'cancel',
//           },
//           {
//             text: 'Yes',
//             style: 'destructive',
//             onPress: async () => {
//               const success = await unassignChipFromVehicle(duplicateInfo?.value, duplicateInfo?.vehicleId);
//               setShowDuplicateModal(false);

//               if (success) {
//                 // Navigate to YardDetailScreen to reload data
//                 navigation.navigate('YardDetailScreen', {
//                   yardName: duplicateInfo?.yardName,
//                   yardId: yardId, // Use current yard ID
//                   refreshData: true // Flag to indicate data should be refreshed
//                 });
//               }
//             },
//           },
//         ]
//       );
//     } catch (error) {
//       console.error('Error unassigning chip from duplicate vehicle:', error);
//     }
//   };

//   // Unassign chip from a specific vehicle in Supabase
//   const unassignChipFromVehicle = async (chipId, vehicleId) => {
//     try {
//       console.log(`🔄 Unassigning chip ${chipId} from vehicle ID ${vehicleId}`);

//       // Update vehicle in Supabase to remove chip
//       const { data, error } = await supabase
//         .from('cars')
//         .update({
//           chip: null // Remove chip assignment
//         })
//         .eq('id', vehicleId)
//         .select();

//       if (error) {
//         console.error('❌ Error unassigning chip in Supabase:', error);
//         Toast.show(`Failed to unassign chip: ${error.message}`, Toast.LONG);
//         return false;
//       }

//       console.log(`✅ Chip ${chipId} unassigned from vehicle in Supabase:`, data);

//       // Move chip to inactive array in chip manager
//       await moveChipToInactive(chipId);
//       console.log(`✅ Chip ${chipId} moved to inactive chips`);

//       Toast.show('✅ Chip unassigned successfully!', Toast.LONG);
//       return true;
//     } catch (error) {
//       console.error('❌ Error unassigning chip from vehicle:', error);
//       Toast.show('Failed to unassign chip', Toast.SHORT);
//       return false;
//     }
//   };

//   // Get direction text from bearing
//   const getDirectionText = (bearing) => {
//     if (bearing === null || bearing === undefined) return '';

//     const normalizedBearing = ((bearing % 360) + 360) % 360;

//     if (normalizedBearing >= 337.5 || normalizedBearing < 22.5) return 'North';
//     if (normalizedBearing >= 22.5 && normalizedBearing < 67.5) return 'Northeast';
//     if (normalizedBearing >= 67.5 && normalizedBearing < 112.5) return 'East';
//     if (normalizedBearing >= 112.5 && normalizedBearing < 157.5) return 'Southeast';
//     if (normalizedBearing >= 157.5 && normalizedBearing < 202.5) return 'South';
//     if (normalizedBearing >= 202.5 && normalizedBearing < 247.5) return 'Southwest';
//     if (normalizedBearing >= 247.5 && normalizedBearing < 292.5) return 'West';
//     if (normalizedBearing >= 292.5 && normalizedBearing < 337.5) return 'Northwest';
//     return '';
//   };

//   // Direction Arrow Component - Points to car location
//   const renderDirectionArrow = () => {
//     if (!getChipId() || !currentLocation || !carLocation) {
//       return null;
//     }

//     return (
//       <Animated.View 
//         style={[
//           styles.directionArrowContainer,
//           {
//             transform: [{
//               rotate: arrowRotation.interpolate({
//                 inputRange: [0, 360],
//                 outputRange: ['0deg', '360deg'],
//               })
//             }]
//           }
//         ]}
//       >
//         {/* Navigation arrow pointing to car - Blue color matching current location */}
//         <Ionicons name="navigate" size={32} color="#007AFF" style={{ transform: [{ rotate: '0deg' }] }} />
//       </Animated.View>
//     );
//   };

//   // Compass Direction Box Component
//   const renderCompassBox = () => {
//     if (!getChipId() || !currentLocation || !carLocation) {
//       return null;
//     }

//     // Calculate arrow rotation for compass box
//     const heading = typeof deviceHeading === 'number' && !isNaN(deviceHeading) ? deviceHeading : 0;
//     const arrowRotationDeg = (bearingToCar - heading + 360) % 360;

//     return (
//       <View style={styles.compassBox}>
//         <Text style={styles.compassLabel}>Direction To Car:</Text>

//         <Text style={styles.compassDeg}>{arrowRotationDeg.toFixed(0)}°</Text>
//       </View>
//     );
//   };

//   const renderMap = () => (
//     <View style={styles.mapContainer}>
//       {/* Show note if no chip assigned */}
//       {!getChipId() && (
//         <View style={styles.noChipNote}>
//           <Text style={styles.noChipText}>📍 Please assign a chip to track vehicle location</Text>
//         </View>
//       )}

//       {/* Compass Direction Box */}
//       {/* {renderCompassBox()} */}

//       <MapView
//         ref={mapRef}
//         style={styles.map}
//         mapType="standard"
//         showsUserLocation={false}
//         showsMyLocationButton={false}
//         rotateEnabled={true}
//         initialRegion={{
//           latitude: currentLocation?.latitude || carLocation?.latitude || 30.713452,
//           longitude: currentLocation?.longitude || carLocation?.longitude || 76.691131,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//         camera={{
//           center: {
//             latitude: currentLocation?.latitude || carLocation?.latitude || 30.713452,
//             longitude: currentLocation?.longitude || carLocation?.longitude || 76.691131,
//           },
//           heading: typeof deviceHeading === 'number' && !isNaN(deviceHeading) ? deviceHeading : 0,
//           pitch: 0,
//           altitude: 1000,
//           zoom: 15,
//         }}
//       >
//         {/* Current Location Marker - Always show when location is available */}
//         {currentLocation && (
//           <Marker
//             coordinate={currentLocation}
//             title="Your Location"
//             description="Current position"
//             anchor={{ x: 0.5, y: 0.5 }}
//             onPress={handleCurrentLocationMarkerClick}
//           >
//             <View style={styles.currentLocationContainer}>
//               {/* Direction Arrow - Above current location, pointing to car */}
//               {getChipId() && carLocation && (
//                 <Animated.View 
//                   style={[
//                     styles.arrowAboveLocation,
//                     {
//                       transform: [{
//                         rotate: arrowRotation.interpolate({
//                           inputRange: [0, 360],
//                           outputRange: ['0deg', '360deg'],
//                         })
//                       }]
//                     }
//                   ]}
//                 >
//                   <Ionicons name="arrow-up" size={40} color="#007AFF" />
//                 </Animated.View>
//               )}
//               {/* Current Location Point - Always visible (blue dot) */}
//               <View style={styles.currentLocationPoint} />
//               {/* User Icon - Only show when marker is clicked */}
//               {showUserIcon && (
//                 <View style={styles.currentLocationMarker}>
//                   <Ionicons name="person" size={20} color="#fff" />
//                 </View>
//               )}
//             </View>
//           </Marker>
//         )}


//         {/* Car Location Marker - Only show if chip is assigned */}
//         {getChipId() && carLocation && (
//           <Marker
//             coordinate={carLocation}
//             title="Vehicle Location"
//             description={`${vehicle?.vin}`}
//           >
//             <View style={styles.carMarkerContainer}>
//               {/* Tooltip */}
//               {savedLocation && (
//                 <View style={styles.tooltip}>
//                   <Text style={styles.tooltipText}>
//                     Last updated: {timeAgo || getTimeAgo(savedLocation.timestamp)}
//                   </Text>

//                 </View>
//               )}

//               {/* Car Icon */}
//               <View style={styles.carLocationMarker}>
//                 <Ionicons name="car" size={15} color="#fff" />
//               </View>
//             </View>
//           </Marker>
//         )}

//         {/* Directions - Always show if chip is assigned and both locations available */}
//         {getChipId() && currentLocation && carLocation && (
//           <MapViewDirections
//             key={`route-${currentLocation.latitude}-${currentLocation.longitude}-${carLocation.latitude}-${carLocation.longitude}`}
//             origin={currentLocation}
//             destination={carLocation}
//             apikey="AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI"
//             strokeWidth={3}
//             strokeColor="#f40d0dff"
//             optimizeWaypoints={true}
//             onReady={(result) => {
//               console.log('🗺️ [DIRECTIONS] Route updated:', result);
//               // Update map region to show both locations and route
//               if (mapRef.current && currentLocation && carLocation) {
//                 const region = calculateMapRegion(currentLocation, carLocation);
//                 mapRef.current.animateToRegion(region, 1000);
//               }
//             }}
//             onError={(errorMessage) => {
//               console.log('❌ [DIRECTIONS] Error:', errorMessage);
//             }}
//           />
//         )}
//       </MapView>
//     </View>
//   );

//   const renderVehicleDetails = () => (
//     <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
//       <View style={styles.vehicleInfoCard}>
//         <Text style={styles.cardTitle}>Vehicle Information</Text>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>VIN Number:</Text>
//           <Text style={styles.infoValue}>{vehicle?.vin || 'N/A'}</Text>
//         </View>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Make :</Text>
//           <Text style={styles.infoValue}>{vehicle?.make} </Text>
//         </View>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Model:</Text>
//           <Text style={styles.infoValue}>{vehicle?.model || 'N/A'}</Text>
//         </View>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Chip Number:</Text>
//           <View style={styles.statusContainer}>
//             {vehicle?.chipId ? (
//               <View style={styles.statusContainer}>
//                 <View style={[styles.statusDot, { backgroundColor: greenColor }]} />
//                 <Text style={[styles.infoValue, { color: greenColor }]}>{vehicle?.chipId}</Text>
//               </View>
//             ) : (
//               <View style={styles.statusContainer}>
//                 <View style={[styles.statusDot, { backgroundColor: '#ff6b6b' }]} />
//                 <Text style={[styles.infoValue, { color: '#ff6b6b' }]}>Not Assigned</Text>
//               </View>
//             )}
//           </View>
//         </View>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Parking Yard:</Text>
//           <Text style={styles.infoValue}>{yardName || 'N/A'}</Text>
//         </View>

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Status:</Text>
//           <View style={styles.statusContainer}>
//             <View style={[styles.statusDot, { backgroundColor: vehicle?.isActive ? greenColor : '#ff6b6b' }]} />
//             <Text style={[styles.statusText, { color: vehicle?.isActive ? greenColor : '#ff6b6b' }]}>
//               {vehicle?.chipId ? (vehicle?.isActive ? 'Active' : 'Inactive') : 'Inactive'}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {getChipId() && <View style={styles.locationInfoCard}>
//         <Text style={styles.cardTitle}>Location Information</Text>
//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Distance to Vehicle:</Text>
//           <Text style={styles.infoValue}>
//             {distanceToCar ?
//               `${distanceToCar} meters (${(distanceToCar / 1000).toFixed(2)} km)` :
//               'Calculating...'
//             }
//           </Text>
//         </View>
//         {savedLocation && (
//           <View style={styles.infoRow}>
//             <Text style={styles.infoLabel}>Last Location Updated:</Text>
//             <Text style={styles.infoValue}>
//               {timeAgo || getTimeAgo(savedLocation.timestamp)}
//             </Text>
//           </View>
//         )}
//         {lastUpdateTime && (
//           <View style={styles.infoRow}>
//             <Text style={styles.infoLabel}>Last Refresh Time:</Text>
//             <Text style={styles.infoValue}>
//               {lastUpdateTime}
//             </Text>
//           </View>
//         )}
//       </View>}

//       {/* Chip Assignment/Unassignment Buttons */}
//       {!vehicle?.chipId ? (
//         <TouchableOpacity
//           style={styles.assignChipButton}
//           onPress={handleAssignChip}
//           activeOpacity={0.8}
//         >
//           <View style={[flexDirectionRow, alignItemsCenter, alignJustifyCenter]}>
//             <Ionicons name="radio" size={20} color="#fff" style={{ marginRight: 8 }} />
//             <Text style={styles.assignChipButtonText}>Assign Chip</Text>
//           </View>
//         </TouchableOpacity>
//       ) : (
//         <TouchableOpacity
//           style={styles.unassignChipButton}
//           onPress={handleUnassignChip}
//           activeOpacity={0.8}
//         >
//           <View style={[flexDirectionRow, alignItemsCenter, alignJustifyCenter]}>
//             <Ionicons name="radio-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
//             <Text style={styles.unassignChipButtonText}>Unassign Chip</Text>
//           </View>
//         </TouchableOpacity>
//       )}

//       {/* Chip History Section */}
//       {chipHistory.length > 0 && (
//         <View style={styles.historyInfoCard}>
//           <Text style={styles.cardTitle}>📚 Chip Assignment History</Text>
//           {chipHistory.map((entry, index) => (
//             <View key={index} style={styles.historyEntry}>
//               <View style={styles.historyHeader}>
//                 <View style={[
//                   styles.historyIcon,
//                   {
//                     backgroundColor: entry.action === 'assigned' ? greenColor :
//                       entry.action === 'vehicle_scanned' ? '#007AFF' : '#ff6b6b'
//                   }
//                 ]}>
//                   <Ionicons
//                     name={entry.action === 'assigned' ? 'checkmark' :
//                       entry.action === 'vehicle_scanned' ? 'phone-portrait' :
//                         'close'}
//                     size={16}
//                     color="#fff"
//                   />
//                 </View>
//                 <View style={styles.historyDetails}>
//                   <Text style={styles.historyAction}>
//                     {entry.action === 'assigned' ? '✅ Assigned' :
//                       entry.action === 'unassigned' ? '❌ Unassigned' :
//                         entry.action === 'vehicle_scanned' ? '📱 Vehicle Scanned' :
//                           '📋 Action'}: {entry.chip_id || entry.vin || 'N/A'}
//                   </Text>
//                   <Text style={styles.historyTime}>
//                     {new Date(entry.timestamp).toLocaleString()}
//                   </Text>
//                   <Text style={styles.historyUser}>
//                     By: {entry.user_name} ({entry.user_email})
//                   </Text>
//                   {entry.notes && (
//                     <Text style={styles.historyNotes}>
//                       {entry.notes}
//                     </Text>
//                   )}
//                 </View>
//               </View>
//             </View>
//           ))}
//         </View>
//       )}
//     </ScrollView>
//   );

//   if (isLoading) {
//     return (
//       <View style={[styles.container, alignJustifyCenter]}>
//         <ActivityIndicator size="large" color="#613EEA" />
//         <Text style={styles.loadingText}>Loading vehicle details...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={[styles.header, flexDirectionRow, alignItemsCenter, justifyContentSpaceBetween]}>
//         <View style={[flexDirectionRow, alignItemsCenter]}>
//           <TouchableOpacity
//             onPress={() => navigation.goBack()}
//             style={styles.backButton}
//           >
//             <Ionicons name="arrow-back" size={28} color="#000" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Vehicle Details</Text>
//         </View>
//         {/* Refresh Button - Only show if chip is assigned */}
//         {getChipId() && (
//           <TouchableOpacity
//             onPress={handleRefreshLocation}
//             style={styles.refreshButton}
//             disabled={isRefreshingLocation}
//           >
//             {isRefreshingLocation ? (
//               <ActivityIndicator size="small" color="#613EEA" />
//             ) : (
//               <Ionicons name="refresh" size={24} color="#613EEA" />
//             )}
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Map Section (30% of screen) */}
//       {renderMap()}

//       {/* Vehicle Details Section (70% of screen) */}
//       {renderVehicleDetails()}

//       {/* Duplicate Chip Modal */}
//       <Modal
//         visible={showDuplicateModal}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setShowDuplicateModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.duplicateModalContent}>
//             {/* Header with Icon */}
//             <View style={styles.duplicateModalHeader}>
//               <View style={styles.duplicateIconContainer}>
//                 <Ionicons name="warning" size={40} color="#FF6B6B" />
//               </View>
//               <Text style={styles.duplicateModalTitle}>Duplicate Chip Found</Text>
//             </View>

//             {/* Content */}
//             <View style={styles.duplicateInfoContainer}>
//               <Text style={styles.duplicateMainMessage}>
//                 This chip is already assigned to a vehicle in
//               </Text>

//               {/* Yard Name - Bold Text */}
//               <Text style={styles.duplicateYardText}>{duplicateInfo?.yardName}</Text>

//               {/* VIN Number - Bold Text */}
//               <Text style={styles.duplicateVinText}>
//                 VIN: {duplicateInfo?.vin}
//               </Text>

//               {/* Chip ID - Bold Text */}
//               <Text style={styles.duplicateChipText}>
//                 Chip: {duplicateInfo?.value}
//               </Text>
//             </View>

//             {/* Action Buttons */}
//             <View style={styles.duplicateButtonContainer}>
//               <TouchableOpacity
//                 style={styles.duplicateUnassignButton}
//                 onPress={handleUnassignFromDuplicate}
//                 activeOpacity={0.8}
//               >
//                 <Ionicons name="radio-outline" size={20} color="#fff" />
//                 <Text style={styles.duplicateUnassignButtonText}>Unassigned Chip</Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={styles.duplicateCloseButton}
//                 onPress={() => setShowDuplicateModal(false)}
//                 activeOpacity={0.8}
//               >
//                 <Ionicons name="checkmark" size={20} color="#fff" />
//                 <Text style={styles.duplicateCloseButtonText}>Got it</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: whiteColor,
//   },
//   header: {
//     padding: spacings.xxxLarge,
//     paddingTop: Platform.OS === 'ios' ? hp(7) : hp(1.7),
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   backButton: {
//     padding: spacings.small,
//     marginRight: spacings.xxLarge,
//   },
//   headerTitle: {
//     fontSize: style.fontSizeNormal2x.fontSize,
//     fontWeight: style.fontWeightThin1x.fontWeight,
//     color: blackColor,
//   },
//   refreshButton: {
//     padding: spacings.small,
//     marginLeft: spacings.medium,
//   },
//   loadingText: {
//     marginTop: spacings.large,
//     fontSize: style.fontSizeNormal.fontSize,
//     color: grayColor,
//   },
//   mapContainer: {
//     height: height * 0.35, // 30% of screen height
//     width: '100%',
//     position: 'relative',
//   },
//   noChipNote: {
//     position: 'absolute',
//     top: 10,
//     left: 10,
//     right: 10,
//     backgroundColor: '#FFF5F5',
//     padding: spacings.small2x,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#FFE5E5',
//     zIndex: 1000,
//   },
//   noChipText: {
//     color: '#FF6B6B',
//     fontSize: style.fontSizeSmall1x.fontSize,
//     fontWeight: style.fontWeightMedium.fontWeight,
//     textAlign: 'center',
//   },
//   map: {
//     flex: 1,
//   },
//   currentLocationContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   arrowAboveLocation: {
//     position: 'absolute',
//     // top: -42,
//     alignItems: 'center',
//     justifyContent: 'center',
//     width: 50,
//     height: 40,
//     zIndex: 1000,
//   },
//   currentLocationPoint: {
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     backgroundColor: '#007AFF',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#007AFF',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.6,
//     shadowRadius: 6,
//     elevation: 6,
//   },
//   currentLocationMarker: {
//     position: 'absolute',
//     top: -40,
//     backgroundColor: '#007AFF',
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#007AFF',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.6,
//     shadowRadius: 6,
//     elevation: 6,
//   },
//   directionArrowContainer: {
//     position: 'absolute',
//     top: -40,
//     left: -16,
//     width: 32,
//     height: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 1,
//   },
//   directionWedge: {
//     position: 'absolute',
//     top: -12, // Start from top edge of blue circle (circle is 18px + 3px border = 21px radius, so -12px from center)
//     left: -30,
//     width: 60,
//     height: 50,
//     alignItems: 'center',
//     justifyContent: 'flex-start',
//     zIndex: 1,
//   },
//   wedgeShape: {
//     width: 0,
//     height: 0,
//     backgroundColor: 'transparent',
//     borderStyle: 'solid',
//     borderLeftWidth: 28,
//     borderRightWidth: 28,
//     borderTopWidth: 50,
//     borderLeftColor: 'transparent',
//     borderRightColor: 'transparent',
//     borderTopColor: 'rgba(0, 122, 255, 0.25)', // Light blue semi-transparent (exact like image)
//   },
//   simpleArrowContainer: {
//     position: 'absolute',
//     alignItems: 'center',
//     justifyContent: 'center',
//     width: 40,
//     height: 40,
//   },
//   arrowBackgroundCircle: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: 'rgba(255, 255, 255, 0.95)',
//     borderWidth: 2,
//     borderColor: '#007AFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#007AFF',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.4,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   arrowDirectionText: {
//     marginTop: 4,
//     fontSize: 9,
//     fontWeight: '600',
//     color: '#007AFF',
//     textAlign: 'center',
//     backgroundColor: 'rgba(255, 255, 255, 0.9)',
//     paddingHorizontal: 4,
//     paddingVertical: 2,
//     borderRadius: 4,
//     overflow: 'hidden',
//   },
//   arrowTriangle: {
//     width: 0,
//     height: 0,
//     backgroundColor: 'transparent',
//     borderStyle: 'solid',
//     borderLeftWidth: 7,
//     borderRightWidth: 7,
//     borderBottomWidth: 14,
//     borderLeftColor: 'transparent',
//     borderRightColor: 'transparent',
//     borderBottomColor: '#FF6B6B',
//   },
//   arrowBody: {
//     width: 6,
//     height: 22,
//     backgroundColor: '#FF6B6B',
//     marginTop: -2,
//     shadowColor: '#FF6B6B',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.6,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   chipLocationMarker: {
//     backgroundColor: '#FF9500',
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   carMarkerContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tooltip: {
//     backgroundColor: 'rgba(0,0,0,0.8)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 6,
//     marginBottom: 5,
//     position: 'relative',
//     minWidth: 150,
//   },
//   tooltipText: {
//     color: '#fff',
//     fontSize: style.fontSizeExtraSmall.fontSize,
//     fontWeight: style.fontWeightMedium.fontWeight,
//     textAlign: 'center',
//     lineHeight: 12,
//   },
//   carLocationMarker: {
//     backgroundColor: '#FF6B6B',
//     width: 25,
//     height: 25,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//     shadowColor: '#FF6B6B',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   detailsContainer: {
//     flex: 1,
//     paddingHorizontal: spacings.large,
//   },
//   vehicleInfoCard: {
//     backgroundColor: whiteColor,
//     borderRadius: 12,
//     padding: spacings.xLarge,
//     marginVertical: spacings.large,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     shadowColor: blackColor,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   locationInfoCard: {
//     backgroundColor: whiteColor,
//     borderRadius: 12,
//     padding: spacings.xLarge,
//     marginBottom: spacings.large,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     shadowColor: blackColor,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   cardTitle: {
//     fontSize: style.fontSizeLarge.fontSize,
//     fontWeight: style.fontWeightThin1x.fontWeight,
//     color: blackColor,
//     marginBottom: spacings.large,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//     paddingBottom: spacings.medium,
//   },
//   infoRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: spacings.medium,
//   },
//   infoLabel: {
//     fontSize: style.fontSizeNormal.fontSize,
//     color: grayColor,
//     flex: 1,
//   },
//   infoValue: {
//     fontSize: style.fontSizeNormal.fontSize,
//     color: blackColor,
//     fontWeight: style.fontWeightMedium.fontWeight,
//     // flex: 2,
//     textAlign: 'right',
//   },
//   statusContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 2,
//     justifyContent: 'flex-end',
//   },
//   statusDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 6,
//   },
//   statusText: {
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightMedium.fontWeight,
//   },
//   assignChipButton: {
//     backgroundColor: '#613EEA',
//     paddingVertical: spacings.large,
//     paddingHorizontal: spacings.xLarge,
//     borderRadius: 25,
//     marginVertical: spacings.large,
//     shadowColor: '#613EEA',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.4,
//     shadowRadius: 10,
//     elevation: 8,
//     borderWidth: 1.5,
//     borderColor: '#7B68EE',
//   },
//   assignChipButtonText: {
//     color: whiteColor,
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightThin1x.fontWeight,
//     letterSpacing: 0.5,
//   },
//   unassignChipButton: {
//     backgroundColor: '#613EEA',
//     paddingVertical: spacings.large,
//     paddingHorizontal: spacings.xLarge,
//     borderRadius: 25,
//     marginVertical: spacings.large,
//     shadowColor: '#613EEA',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.4,
//     shadowRadius: 10,
//     elevation: 8,
//     borderWidth: 1.5,
//     borderColor: '#7B68EE',
//   },
//   unassignChipButtonText: {
//     color: whiteColor,
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightThin1x.fontWeight,
//     letterSpacing: 0.5,
//   },
//   // Modal Styles
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   duplicateModalContent: {
//     backgroundColor: '#fff',
//     borderRadius: 24,
//     padding: spacings.none,
//     width: '90%',
//     maxWidth: 380,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 20 },
//     shadowOpacity: 0.3,
//     shadowRadius: 25,
//     elevation: 15,
//     overflow: 'hidden',
//   },
//   duplicateModalHeader: {
//     backgroundColor: '#FFF5F5',
//     paddingVertical: 24,
//     paddingHorizontal: 24,
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   duplicateIconContainer: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: '#FFE5E5',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//     borderWidth: 3,
//     borderColor: '#FF6B6B',
//   },
//   duplicateModalTitle: {
//     fontSize: style.fontSizeLargeX.fontSize,
//     fontWeight: style.fontWeightBold.fontWeight,
//     color: '#333',
//     textAlign: 'center',
//     letterSpacing: 0.5,
//   },
//   duplicateInfoContainer: {
//     padding: spacings.LargeXX,
//   },
//   duplicateMainMessage: {
//     fontSize: style.fontSizeNormal.fontSize,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 20,
//     lineHeight: 24,
//     fontWeight: style.fontWeightThin1x.fontWeight,
//   },
//   duplicateYardText: {
//     fontSize: style.fontSizeMedium1x.fontSize,
//     fontWeight: style.fontWeightBold.fontWeight,
//     color: '#613EEA',
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   duplicateVinText: {
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightBold.fontWeight,
//     color: '#333',
//     textAlign: 'center',
//     marginBottom: 8,
//     fontFamily: 'monospace',
//   },
//   duplicateChipText: {
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightBold.fontWeight,
//     color: '#333',
//     textAlign: 'center',
//     marginBottom: 8,
//     fontFamily: 'monospace',
//   },
//   duplicateButtonContainer: {
//     flexDirection: 'row',
//     borderTopWidth: 1,
//     borderTopColor: '#F0F0F0',
//     padding: 10,
//     justifyContent: 'space-between',
//   },
//   duplicateUnassignButton: {
//     backgroundColor: orangeColor,
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     flex: 1,
//     marginRight: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderRadius: 10,
//     shadowColor: orangeColor,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   duplicateUnassignButtonText: {
//     color: '#fff',
//     fontSize: style.fontSizeSmall1x.fontSize,
//     fontWeight: '700',
//     marginLeft: 8,
//     letterSpacing: 0.5,
//   },
//   duplicateCloseButton: {
//     backgroundColor: '#613EEA',
//     paddingVertical: 10,
//     paddingHorizontal: 10,
//     flex: 1,
//     marginLeft: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderRadius: 10,
//     shadowColor: '#613EEA',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   duplicateCloseButtonText: {
//     color: '#fff',
//     fontSize: style.fontSizeSmall1x.fontSize,
//     fontWeight: '700',
//     marginLeft: 8,
//     letterSpacing: 0.5,
//   },
//   // History Styles
//   historyInfoCard: {
//     backgroundColor: whiteColor,
//     borderRadius: 12,
//     padding: spacings.xLarge,
//     marginVertical: spacings.large,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     shadowColor: blackColor,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: hp(13),
//   },
//   historyEntry: {
//     marginBottom: spacings.medium,
//     paddingBottom: spacings.medium,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   historyHeader: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//   },
//   historyIcon: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: spacings.medium,
//   },
//   historyDetails: {
//     flex: 1,
//   },
//   historyAction: {
//     fontSize: style.fontSizeNormal.fontSize,
//     fontWeight: style.fontWeightMedium.fontWeight,
//     color: blackColor,
//     marginBottom: 4,
//   },
//   historyTime: {
//     fontSize: style.fontSizeSmall.fontSize,
//     color: grayColor,
//     marginBottom: 2,
//   },
//   historyUser: {
//     fontSize: style.fontSizeSmall.fontSize,
//     color: grayColor,
//     marginBottom: 4,
//   },
//   historyNotes: {
//     fontSize: style.fontSizeSmall.fontSize,
//     color: grayColor,
//     fontStyle: 'italic',
//   },
//   // Compass Box Styles
//   compassBox: {
//     position: 'absolute',
//     top: 50,
//     left: 20,
//     zIndex: 999,
//     backgroundColor: 'white',
//     padding: 15,
//     borderRadius: 15,
//     elevation: 5,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   compassLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 5,
//     color: blackColor,
//   },
//   compassArrowContainer: {
//     width: 60,
//     height: 60,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   compassDeg: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginTop: 5,
//     color: blackColor,
//   },
// });

// export default VehicleDetailsScreen;
import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions, PermissionsAndroid, Platform, Modal, Animated } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import haversine from 'haversine-distance';
import mqtt from "mqtt/dist/mqtt";
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor, orangeColor, lightOrangeColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addActiveChip, moveChipToInactive, moveChipToActive, removeInactiveChip } from '../utils/chipManager';
import { supabase } from '../lib/supabaseClient';
import { checkChipOnlineStatus } from '../utils/chipStatusAPI';
import { getMQTTConfig } from '../constants/Constants';
import Toast from 'react-native-simple-toast';
import { useSelector } from 'react-redux';
import { requestLocationPermission, checkLocationPermission, shouldRequestPermission } from '../utils/locationPermission';
import CompassHeading from 'react-native-compass-heading';

const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const { width, height } = Dimensions.get('window');

const VehicleDetailsScreen = ({ navigation, route }) => {
  const { vehicle: initialVehicle, yardName, yardId } = route?.params || {};
  const [vehicle, setVehicle] = useState(initialVehicle);

  // Get current user from Redux store
  const userData = useSelector(state => state.user.userData);
  const mapRef = useRef(null);
  const mqttLocationCallbackRef = useRef(null); // For refresh button MQTT callback
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // 🔒 LOCK VARIABLE: To prevent auto-zoom loop (Fixed by Ref)
  const hasZoomedRef = useRef(false);

  // Location states
  const [currentLocation, setCurrentLocation] = useState(null);
  const [chipLocation, setChipLocation] = useState(null);
  const [carLocation, setCarLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [distanceToCar, setDistanceToCar] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // MQTT states
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [mqttDataReceived, setMqttDataReceived] = useState(false);

  // Saved location states
  const [savedLocation, setSavedLocation] = useState(null);
  const [timeAgo, setTimeAgo] = useState('');

  // Duplicate validation states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  // History states
  const [chipHistory, setChipHistory] = useState([]);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('chip'); // 'chip' or 'vehicle'

  // Current location visibility state - show user icon when clicked
  const [showUserIcon, setShowUserIcon] = useState(false);

  // Map fullscreen state
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Map type state
  const [mapType, setMapType] = useState('standard'); // 'satellite' or 'standard'

  // Heading & Bearing Variables
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [bearingToCar, setBearingToCar] = useState(0);
  const arrowRotation = useRef(new Animated.Value(0)).current;

  // Navigation Steps States
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  // Get chip ID from vehicle data (device ID)
  const getChipId = () => {
    return vehicle?.chip || vehicle?.chipId; // Support both chip and chipId fields
  };

  // Get current user info for history
  const getCurrentUser = () => {
    try {
      if (userData) {
        return {
          name: userData?.name || userData?.email || 'Admin User',
          email: userData?.email || 'admin@example.com'
        };
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
  };

  // Add entry to chip history
  const addToHistory = async (action, chipId, notes) => {
    try {
      const user = getCurrentUser();
      const newEntry = {
        action,
        chip_id: chipId,
        vin: vehicle?.vin,
        timestamp: new Date().toISOString(),
        user_name: user.name,
        user_email: user.email,
        notes
      };

      const { data: currentData, error: fetchError } = await supabase
        .from('cars')
        .select('history')
        .eq('id', vehicle.id)
        .single();

      if (fetchError) return;

      const existingHistory = currentData?.history || { chip_history: [] };
      const historyArray = existingHistory.chip_history || [];

      const updatedHistory = {
        chip_history: [newEntry, ...historyArray]
      };

      const { error: updateError } = await supabase
        .from('cars')
        .update({ history: updatedHistory })
        .eq('id', vehicle.id);

      if (!updateError) {
        setChipHistory(updatedHistory.chip_history);
      }
    } catch (error) {
      console.error('📚 [HISTORY] Error adding to history:', error);
    }
  };

  // Load chip history from database
  const loadChipHistory = async () => {
    try {
      if (!vehicle?.id) return;
      const { data, error } = await supabase
        .from('cars')
        .select('history')
        .eq('id', vehicle.id)
        .single();

      if (data?.history?.chip_history) {
        setChipHistory(data.history.chip_history);
      } else {
        setChipHistory([]);
      }
    } catch (error) {
      console.error('📚 [HISTORY] Error loading chip history:', error);
    }
  };

  // Load vehicle history from carHistory table
  const loadVehicleHistory = async () => {
    try {
      const chipId = getChipId();
      if (!chipId) {
        setVehicleHistory([]);
        return;
      }

      console.log('📚 [VEHICLE HISTORY] Fetching history for chipId:', chipId);

      const { data, error } = await supabase
        .from('carHistory')
        .select('*')
        .eq('chipId', chipId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📚 [VEHICLE HISTORY] Error fetching vehicle history:', error);
        setVehicleHistory([]);
        return;
      }

      if (data && data.length > 0) {
        console.log('📚 [VEHICLE HISTORY] Found', data.length, 'entries');
        setVehicleHistory(data);
      } else {
        console.log('📚 [VEHICLE HISTORY] No history found');
        setVehicleHistory([]);
      }
    } catch (error) {
      console.error('📚 [VEHICLE HISTORY] Error loading vehicle history:', error);
      setVehicleHistory([]);
    }
  };

  // Save chip location to AsyncStorage
  const saveChipLocation = async (chipId, latitude, longitude, timestamp) => {
    try {
      const chipData = {
        latitude,
        longitude,
        timestamp,
        lastUpdated: new Date(timestamp).toLocaleTimeString()
      };
      await AsyncStorage.setItem(`chip_${chipId}`, JSON.stringify(chipData));
    } catch (error) {
      console.error('Error saving chip location:', error);
    }
  };

  // Load saved chip location from AsyncStorage
  const loadChipLocation = async (chipId) => {
    try {
      const saved = await AsyncStorage.getItem(`chip_${chipId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading chip location:', error);
    }
    return null;
  };

  // Helper function to parse database timestamp to UTC milliseconds
  const parseDatabaseTimestamp = (dbTimestamp) => {
    if (!dbTimestamp) return Date.now();
    try {
      if (dbTimestamp.endsWith('Z')) {
        return new Date(dbTimestamp).getTime();
      }
      const timestampStr = dbTimestamp.includes('T') ? dbTimestamp : dbTimestamp.replace(' ', 'T');
      return new Date(timestampStr + 'Z').getTime();
    } catch (error) {
      return new Date(dbTimestamp).getTime();
    }
  };

  // Calculate time ago from timestamp
  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  // Function to get yard name from facility ID
  const getYardNameFromId = async (facilityId) => {
    try {
      if (!facilityId || facilityId === 'Unknown') return 'Unknown Yard';
      const { data: facilityData, error } = await supabase
        .from('facility')
        .select('name')
        .eq('id', facilityId)
        .single();

      if (error || !facilityData) return `Yard ${facilityId}`;
      return facilityData.name;
    } catch (error) {
      return `Yard ${facilityId}`;
    }
  };

  // Check if chip already exists in Supabase (case-insensitive)
  const checkChipExists = async (chipId) => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('id, chip, vin, facilityId, make, model')
        .ilike('chip', chipId)
        .not('chip', 'is', null);

      if (error) return { exists: false };

      if (data && data.length > 0) {
        const foundVehicle = data[0];
        const yardName = await getYardNameFromId(foundVehicle.facilityId);
        return {
          exists: true,
          vehicle: {
            id: foundVehicle.id,
            vin: foundVehicle.vin,
            chipId: foundVehicle.chip,
            make: foundVehicle.make,
            model: foundVehicle.model
          },
          yardName: yardName
        };
      }
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  };

  // Initialize MQTT connection
  const initializeMqtt = () => {
    try {
      const MQTT_CONFIG = getMQTTConfig('react');
      const client = mqtt.connect(MQTT_CONFIG.host, {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clientId: MQTT_CONFIG.clientId,
        protocolVersion: MQTT_CONFIG.protocolVersion,
      });

      let latestLat = null;
      let latestLon = null;
      const targetChipId = getChipId();

      client.on("connect", () => {
        setMqttConnected(true);
        const latitudeTopic = `/device_sensor_data/449810146246400/${targetChipId}/+/vs/4198`;
        const longitudeTopic = `/device_sensor_data/449810146246400/${targetChipId}/+/vs/4197`;
        client.subscribe(latitudeTopic);
        client.subscribe(longitudeTopic);
      });

      client.on("message", async (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          if (topic.includes("4197")) {
            latestLon = payload.value;
          } else if (topic.includes("4198")) {
            latestLat = payload.value;
          }

          if (latestLat !== null && latestLon !== null) {
            const latitude = parseFloat(latestLat);
            const longitude = parseFloat(latestLon);

            if (!isNaN(latitude) && !isNaN(longitude)) {
              const timestamp = Date.now();
              const nextCoords = { latitude, longitude };

              await saveChipLocation(targetChipId, latitude, longitude, timestamp);

              try {
                const currentTimestamp = new Date().toISOString();
                await supabase
                  .from('cars')
                  .update({
                    latitude: latitude,
                    longitude: longitude,
                    last_location_update: currentTimestamp
                  })
                  .eq('chip', targetChipId);
              } catch (dbError) {
                console.error('Database update error', dbError);
              }

              const currentTime = Date.now();
              const updatedLocation = {
                latitude,
                longitude,
                timestamp: currentTime,
                lastUpdated: new Date(currentTime).toLocaleTimeString()
              };
              setSavedLocation(updatedLocation);

              setChipLocation(nextCoords);
              setCarLocation(nextCoords);
              setMqttDataReceived(true);
              setLastUpdateTime(new Date().toLocaleTimeString());
              setTimeAgo(getTimeAgo(currentTime));

              if (mqttLocationCallbackRef.current) {
                mqttLocationCallbackRef.current(nextCoords);
                mqttLocationCallbackRef.current = null;
              }

              if (currentLocation) {
                const distance = calculateDistance(currentLocation, nextCoords);
                setDistanceToCar(distance);
              }

              // NOTE: We do NOT animateToRegion here to avoid zoom loop.
              latestLat = null;
              latestLon = null;
            }
          }
        } catch (error) {
          console.error('Error parsing MQTT message:', error);
        }
      });

      client.on("error", (error) => {
        setMqttConnected(false);
      });

      client.on("close", () => {
        setMqttConnected(false);
      });

      setMqttClient(client);

    } catch (error) {
      setMqttConnected(false);
    }
  };

  // Request location permission using utility
  const requestLocationPermissionLocal = async () => {
    const hasPermission = await checkLocationPermission();
    if (hasPermission) {
      setLocationPermission(true);
      return true;
    }

    const shouldRequest = await shouldRequestPermission();
    if (!shouldRequest) {
      setLocationPermission(false);
      return false;
    }

    const granted = await requestLocationPermission({
      title: 'Location Permission',
      message: 'This app needs access to your location to show your position on the map.',
      onGranted: () => { setLocationPermission(true); },
      onDenied: () => { setLocationPermission(false); },
    });

    setLocationPermission(granted);
    return granted;
  };

  // Calculate bearing (angle) from current location to car location
  const calculateBearing = (start, end) => {
    if (!start || !end) return 0;
    const startLat = start.latitude * Math.PI / 180;
    const startLng = start.longitude * Math.PI / 180;
    const endLat = end.latitude * Math.PI / 180;
    const endLng = end.longitude * Math.PI / 180;

    const dLng = endLng - startLng;
    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;
    try {
      const distance = haversine(
        { lat: point1.latitude, lng: point1.longitude },
        { lat: point2.latitude, lng: point2.longitude }
      );
      return Math.round(distance);
    } catch (error) {
      // Fallback
      const R = 6371e3;
      const φ1 = point1.latitude * Math.PI / 180;
      const φ2 = point2.latitude * Math.PI / 180;
      const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
      const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    }
  };

  // Calculate optimal map region to show all locations with distance-based zoom
  const calculateMapRegion = (currentLoc, carLoc) => {
    if (!currentLoc || !carLoc) {
      return {
        latitude: currentLoc?.latitude || 30.713452,
        longitude: currentLoc?.longitude || 76.691131,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // Calculate distance between current location and car location
    const distance = calculateDistance(currentLoc, carLoc);

    // Calculate bounds to include both locations
    const minLat = Math.min(currentLoc.latitude, carLoc.latitude);
    const maxLat = Math.max(currentLoc.latitude, carLoc.latitude);
    const minLng = Math.min(currentLoc.longitude, carLoc.longitude);
    const maxLng = Math.max(currentLoc.longitude, carLoc.longitude);

    // Calculate center point
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Distance-based zoom calculation
    let baseDelta;
    let paddingMultiplier;

    if (distance < 50) {
      // Very close (< 50m): Zoom in a lot
      baseDelta = 0.0008;
      paddingMultiplier = 2.0; // 200% padding for very close locations
    } else if (distance < 200) {
      // Close (50-200m): Zoom in
      baseDelta = 0.002;
      paddingMultiplier = 1.5; // 150% padding
    } else if (distance < 1000) {
      // Medium (200m-1km): Moderate zoom
      baseDelta = 0.01;
      paddingMultiplier = 1.3; // 130% padding
    } else if (distance < 5000) {
      // Far (1-5km): Zoom out
      baseDelta = 0.02;
      paddingMultiplier = 1.2; // 120% padding
    } else {
      // Very far (> 5km): Zoom out more
      baseDelta = 0.05;
      paddingMultiplier = 1.1; // 110% padding
    }

    // Calculate actual deltas based on bounds and distance
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    // Use the larger of: calculated span with padding, or distance-based delta
    const latDelta = Math.max(
      (latSpan * paddingMultiplier) || baseDelta,
      baseDelta
    );
    const lngDelta = Math.max(
      (lngSpan * paddingMultiplier) || baseDelta,
      baseDelta
    );

    console.log(`🗺️ [MAP] Distance: ${distance}m, Zoom Delta: ${latDelta.toFixed(4)}`);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  // Get current location alternative - disabled only for chip ending with "39d"
  const getCurrentLocationAlternative = () => {
    const chipId = getChipId();
    
    // Skip if chip ID ends with "39d" (using static coordinates)
    if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
      console.log('🧪 [TEST] getCurrentLocationAlternative skipped for static chip');
      return;
    }

    // Normal dynamic location fetching for other chips
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCurrentLocation = { latitude, longitude };
        setCurrentLocation(newCurrentLocation);
        if (carLocation) {
          const distance = calculateDistance(newCurrentLocation, carLocation);
          setDistanceToCar(distance);
        }
        setLastUpdateTime(new Date().toLocaleTimeString());
        setIsLoading(false);
      },
      (error) => {
        if (error.code === 3) {
          getCurrentLocationThirdAttempt();
        } else {
          setIsLoading(false);
          setLastUpdateTime(new Date().toLocaleTimeString());
        }
      },
      { enableHighAccuracy: false, timeout: 45000, maximumAge: 300000, distanceFilter: 100 }
    );
  };

  // Get current location - disabled only for chip ending with "39d"
  const getCurrentLocation = () => {
    const chipId = getChipId();
    
    // Skip if chip ID ends with "39d" (using static coordinates)
    if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
      console.log('🧪 [TEST] getCurrentLocation skipped for static chip');
      return;
    }

    // Normal dynamic location fetching for other chips
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCurrentLocation = { latitude, longitude };
        setCurrentLocation(newCurrentLocation);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setIsLoading(false);
      },
      (error) => {
        if (error.code === 3) {
          getCurrentLocationAlternative();
        } else if (error.code === 1) {
          setLocationPermission(false);
          setIsLoading(false);
        } else if (Platform.OS === 'android') {
          getCurrentLocationAlternative();
        } else {
          setIsLoading(false);
          setLocationPermission(false);
        }
      },
      { enableHighAccuracy: false, timeout: Platform.OS === 'android' ? 30000 : 15000, maximumAge: Platform.OS === 'android' ? 0 : 10000, distanceFilter: 0 }
    );
  };

  // Get current location third attempt - disabled only for chip ending with "39d"
  const getCurrentLocationThirdAttempt = () => {
    const chipId = getChipId();
    
    // Skip if chip ID ends with "39d" (using static coordinates)
    if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
      console.log('🧪 [TEST] getCurrentLocationThirdAttempt skipped for static chip');
      return;
    }

    // Normal dynamic location fetching for other chips
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCurrentLocation = { latitude, longitude };
        setCurrentLocation(newCurrentLocation);
        if (carLocation) {
          const distance = calculateDistance(newCurrentLocation, carLocation);
          setDistanceToCar(distance);
        }
        setLastUpdateTime(new Date().toLocaleTimeString());
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        setLastUpdateTime(new Date().toLocaleTimeString());
      },
      { enableHighAccuracy: false, timeout: 60000, maximumAge: 600000, distanceFilter: 500 }
    );
  };

  // 🧪 TESTING: Set static coordinates ONLY for chip ID ending with "39d"
  useEffect(() => {
    const chipId = getChipId();
    
    // Only use static coordinates if chip ID ends with "39d"
    if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
      // Static test coordinates
      const testCurrentLocation = {
        latitude: 35.969658,
        longitude: -86.492557
      };
      const testCarLocation = {
        latitude: 35.969036,
        longitude: -86.493105
      };

      // Set static locations for testing - FORCE SET
      setCurrentLocation(testCurrentLocation);
      setCarLocation(testCarLocation);
      setChipLocation(testCarLocation);

      // Set saved location for testing
      setSavedLocation({
        latitude: testCarLocation.latitude,
        longitude: testCarLocation.longitude,
        timestamp: Date.now(),
        lastUpdated: new Date().toLocaleTimeString()
      });

      // Calculate distance for testing
      const distance = calculateDistance(testCurrentLocation, testCarLocation);
      setDistanceToCar(distance);

      // Set loading to false so map can render
      setIsLoading(false);

      // Force map zoom after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          const region = calculateMapRegion(testCurrentLocation, testCarLocation);
          mapRef.current.animateToRegion(region, 1000);
          hasZoomedRef.current = true;
        }
      }, 1000);

      console.log('🧪 [TEST] Static coordinates set for chip ending with 39d');
      console.log('🧪 [TEST] Chip ID:', chipId);
      console.log('🧪 [TEST] Current Location:', testCurrentLocation);
      console.log('🧪 [TEST] Car Location:', testCarLocation);
      console.log('🧪 [TEST] Distance:', distance, 'meters');
    } else {
      console.log('📍 [DYNAMIC] Using dynamic coordinates for chip:', chipId);
    }
  }, [vehicle?.chipId, vehicle?.chip]);

  // Check chip online status
  useEffect(() => {
    const checkChipStatus = async () => {
      const chipId = getChipId();
      if (chipId) {
        try {
          const statusMap = await checkChipOnlineStatus([chipId]);
          const chipStatus = statusMap[chipId];
          if (chipStatus) {
            const isActive = chipStatus.online_status === 1;
            setVehicle(prev => ({ ...prev, isActive: isActive, onlineStatus: chipStatus.online_status }));
          }
        } catch (error) { }
      }
    };
    checkChipStatus();
  }, [vehicle?.chipId]);

  // Initialize location tracking and MQTT
  useEffect(() => {
    const initializeLocation = async () => {
      const chipId = getChipId();
      
      // Skip dynamic initialization if chip ID ends with "39d" (using static coordinates)
      if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
        console.log('🧪 [TEST] Skipping dynamic initialization for static chip');
        loadChipHistory();
        loadVehicleHistory();
        setIsLoading(false);
        setLastUpdateTime(new Date().toLocaleTimeString());
        return;
      }

      // Normal dynamic initialization for other chips
      if (chipId) {
        try {
          const { data: carData, error: dbError } = await supabase
            .from('cars')
            .select('latitude, longitude, last_location_update')
            .eq('chip', chipId)
            .single();

          if (!dbError && carData && carData.latitude && carData.longitude) {
            const timestamp = parseDatabaseTimestamp(carData.last_location_update);
            setSavedLocation({
              latitude: carData.latitude,
              longitude: carData.longitude,
              timestamp: timestamp,
              lastUpdated: new Date(timestamp).toLocaleTimeString()
            });
            setChipLocation({ latitude: carData.latitude, longitude: carData.longitude });
            setCarLocation({ latitude: carData.latitude, longitude: carData.longitude });
            setMqttDataReceived(true);
            setTimeAgo(getTimeAgo(timestamp));
          } else {
            const saved = await loadChipLocation(chipId);
            if (saved) {
              setSavedLocation(saved);
              setChipLocation({ latitude: saved.latitude, longitude: saved.longitude });
              setCarLocation({ latitude: saved.latitude, longitude: saved.longitude });
              setMqttDataReceived(true);
              setTimeAgo(getTimeAgo(saved.timestamp));
            }
          }
        } catch (error) {
          const saved = await loadChipLocation(chipId);
          if (saved) {
            setSavedLocation(saved);
            setChipLocation({ latitude: saved.latitude, longitude: saved.longitude });
            setCarLocation({ latitude: saved.latitude, longitude: saved.longitude });
            setMqttDataReceived(true);
            setTimeAgo(getTimeAgo(saved.timestamp));
          }
        }
        initializeMqtt();
        loadChipHistory();
        loadVehicleHistory();
      }

      setIsLoading(false);
      setLastUpdateTime(new Date().toLocaleTimeString());

      const hasPermission = await checkLocationPermission();
      if (hasPermission) {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        requestLocationPermissionLocal().then((granted) => {
          if (granted) getCurrentLocation();
        });
      }
    };

    initializeLocation();

    return () => {
      if (mqttClient) {
        mqttClient.end();
        setMqttClient(null);
        setMqttConnected(false);
      }
    };
  }, [vehicle?.chipId, vehicle?.chip]);

  // Update location every 30s - skip for chip ending with "39d"
  useEffect(() => {
    const chipId = getChipId();
    
    // Skip periodic updates if chip ID ends with "39d" (using static coordinates)
    if (chipId && chipId.toString().toLowerCase().endsWith('39d')) {
      return;
    }

    // Normal periodic updates for other chips
    if (!locationPermission) return;
    const locationInterval = setInterval(() => {
      if (locationPermission) getCurrentLocation();
    }, 30000);
    return () => clearInterval(locationInterval);
  }, [locationPermission, vehicle?.chipId, vehicle?.chip]);

  // ✅ 1. COMPASS & MAP ROTATION LOGIC
  useEffect(() => {
    const degree_update_rate = 3;
    CompassHeading.start(degree_update_rate, ({ heading }) => {
      setDeviceHeading(heading);

      // ROTATE MAP CAMERA BASED ON COMPASS
      if (mapRef.current) {
        mapRef.current.animateCamera({ heading: heading, duration: 200 });
      }
    });

    return () => CompassHeading.stop();
  }, []);

  // Calculate Bearing when locations update
  useEffect(() => {
    if (!currentLocation || !carLocation) return;
    const bearing = calculateBearing(currentLocation, carLocation);
    setBearingToCar(bearing);
  }, [currentLocation, carLocation]);

  useFocusEffect(
    React.useCallback(() => {
      const checkPermissionOnFocus = async () => {
        setIsLoading(false);
        const hasPermission = await checkLocationPermission();
        if (hasPermission) {
          setLocationPermission(true);
          if (!currentLocation) getCurrentLocation();
        } else {
          setLocationPermission(false);
        }
      };
      checkPermissionOnFocus();
    }, [])
  );

  const handleCurrentLocationMarkerClick = () => {
    setShowUserIcon(!showUserIcon);
  };

  const handleRefreshLocation = async () => {
    const chipId = getChipId();
    if (!chipId) return;

    // Reset Zoom Lock to allow manual center once
    hasZoomedRef.current = false;

    setIsRefreshingLocation(true);
    try {
      const waitForMqttLocation = new Promise((resolve, reject) => {
        mqttLocationCallbackRef.current = (location) => {
          resolve(location);
        };
        setTimeout(() => {
          if (mqttLocationCallbackRef.current) {
            mqttLocationCallbackRef.current = null;
            reject(new Error('MQTT timeout'));
          }
        }, 15000);
      });

      if (mqttClient) {
        mqttClient.end();
        setMqttClient(null);
        setMqttConnected(false);
      }
      initializeMqtt();

      try {
        await waitForMqttLocation;
        setIsRefreshingLocation(false);
        return;
      } catch (error) {
        const { data: carData } = await supabase
          .from('cars')
          .select('latitude, longitude, last_location_update')
          .eq('chip', chipId)
          .single();

        if (carData && carData.latitude && carData.longitude) {
          const timestamp = parseDatabaseTimestamp(carData.last_location_update);
          setSavedLocation({
            latitude: carData.latitude,
            longitude: carData.longitude,
            timestamp: timestamp,
            lastUpdated: new Date(timestamp).toLocaleTimeString()
          });
          setChipLocation({ latitude: carData.latitude, longitude: carData.longitude });
          setCarLocation({ latitude: carData.latitude, longitude: carData.longitude });
          setMqttDataReceived(true);
          setTimeAgo(getTimeAgo(timestamp));
          setLastUpdateTime(new Date().toLocaleTimeString());
        }
        setIsRefreshingLocation(false);
      }
    } catch (error) {
      setIsRefreshingLocation(false);
    }
  };

  useEffect(() => {
    if (savedLocation) {
      setTimeAgo(getTimeAgo(savedLocation.timestamp));
      const interval = setInterval(() => {
        if (savedLocation && savedLocation.timestamp) {
          const updatedTime = getTimeAgo(savedLocation.timestamp);
          setTimeAgo(updatedTime);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [savedLocation]);

  useEffect(() => {
    if (currentLocation && carLocation) {
      const distance = calculateDistance(currentLocation, carLocation);
      setDistanceToCar(distance);
    }
  }, [currentLocation, carLocation]);

  // Calculate current step based on distance
  const calculateCurrentStep = () => {
    if (!routeSteps || routeSteps.length === 0 || !currentLocation || distanceToCar === null) {
      setCurrentStep(null);
      return;
    }

    // Calculate total route distance
    let totalRouteDistance = 0;
    routeSteps.forEach(step => {
      totalRouteDistance += step.distance?.value || 0;
    });

    // Distance traveled = total distance - remaining distance
    const distanceTraveled = Math.max(0, totalRouteDistance - distanceToCar);

    // Find which step we're currently on
    let accumulatedDistance = 0;
    let currentStepIndex = 0;

    for (let i = 0; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      const stepDistance = step.distance?.value || 0;

      if (accumulatedDistance + stepDistance <= distanceTraveled) {
        accumulatedDistance += stepDistance;
        currentStepIndex = i + 1;
      } else {
        break;
      }
    }

    // Get current step
    if (currentStepIndex < routeSteps.length) {
      const step = routeSteps[currentStepIndex];
      const stepStartDistance = accumulatedDistance;
      const remainingDistanceInStep = Math.max(0, (stepStartDistance + (step.distance?.value || 0)) - distanceTraveled);

      // Clean HTML tags from instruction
      const cleanInstruction = step.html_instructions?.replace(/<[^>]*>/g, '') || step.instructions || 'Continue';

      setCurrentStep({
        instruction: cleanInstruction,
        distance: Math.round(remainingDistanceInStep),
        stepIndex: currentStepIndex
      });
    } else {
      // Reached destination or very close
      if (distanceToCar < 10) {
        setCurrentStep({
          instruction: 'You have arrived at your destination',
          distance: 0,
          stepIndex: routeSteps.length
        });
      } else {
        // Show last step
        const lastStep = routeSteps[routeSteps.length - 1];
        const cleanInstruction = lastStep.html_instructions?.replace(/<[^>]*>/g, '') || lastStep.instructions || 'Continue';
        setCurrentStep({
          instruction: cleanInstruction,
          distance: Math.round(distanceToCar),
          stepIndex: routeSteps.length - 1
        });
      }
    }
  };

  // Update current step when distance or route changes
  useEffect(() => {
    if (routeSteps.length > 0 && distanceToCar !== null) {
      calculateCurrentStep();
    }
  }, [distanceToCar, routeSteps, currentLocation]);

  // ✅ 3. MAIN ZOOM LOCK LOGIC
  useEffect(() => {
    // If already zoomed once, stop.
    if (hasZoomedRef.current) return;

    if (currentLocation && carLocation && mapRef.current && !isLoading) {
      const timer = setTimeout(() => {
        if (!hasZoomedRef.current) {
          const region = calculateMapRegion(currentLocation, carLocation);
          mapRef.current.animateToRegion(region, 1000);
          hasZoomedRef.current = true; // LOCK
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (carLocation && mapRef.current && !isLoading) {
      const timer = setTimeout(() => {
        if (!hasZoomedRef.current) {
          mapRef.current.animateToRegion({
            latitude: carLocation.latitude,
            longitude: carLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
          hasZoomedRef.current = true; // LOCK
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentLocation, carLocation, isLoading]);

  const updateVehicleWithChip = async (chipId) => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .update({ chip: chipId })
        .eq('vin', vehicle.vin)
        .select();

      if (error) {
        Toast.show(`Failed to ${chipId ? 'assign' : 'unassign'} chip: ${error.message}`, Toast.LONG);
        return;
      }

      const updatedVehicle = {
        ...vehicle,
        chipId: chipId,
        chip: chipId,
        isActive: chipId ? true : false,
        lastUpdated: new Date().toISOString()
      };
      setVehicle(updatedVehicle);

      if (chipId) {
        await removeInactiveChip(chipId);
        await addActiveChip({
          chipId: chipId,
          vehicleId: vehicle.id,
          vin: vehicle.vin,
          make: vehicle.make,
          model: vehicle.model,
          yardId: yardId,
          yardName: yardName || 'Unknown Yard'
        });
        Toast.show('✅ Chip assigned successfully!', Toast.LONG);
      } else {
        if (vehicle.chipId || vehicle.chip) {
          const oldChipId = vehicle.chipId || vehicle.chip;
          await moveChipToInactive(oldChipId);
        }
        Toast.show('✅ Chip unassigned successfully!', Toast.LONG);
      }
    } catch (error) {
      Toast.show(`Failed to ${chipId ? 'assign' : 'unassign'} chip`, Toast.SHORT);
    }
  };

  const handleUnassignChip = async () => {
    try {
      const chipId = vehicle?.chipId || vehicle?.chip;
      Alert.alert(
        'Unassign Chip',
        `Are you sure you want to unassign this chip?\n\nChip ID: ${chipId}\n\nThe vehicle will become inactive.`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              const chipId = vehicle?.chipId || vehicle?.chip;
              await updateVehicleWithChip(null);
              await addToHistory('unassigned', chipId, 'Chip unassigned successfully');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error unassigning chip:', error);
    }
  };

  const handleAssignChip = async () => {
    try {
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');
      const config = {
        license: 't0106HAEAAHzeSbXnzxTF1q/CibMNJ9Rs/d+Mr1go8Ei1Ca/DsVz7oHBgmTAqPAI1+Qm+mZuykTKpLGSMnYRSb7/O9fLWl9kAtwG6uNlxzb0WeKN3Tqp9nqNejm+eTuH8dyp9nW5WXF42iKU56Q==;t0109HAEAALVBi/VLPlWfzPA0RQBXzFhWyqtHKnUpwCzsrabGTAEfMsiO/36D/SvYGIPrZuRi2U6ptBwKu64cW9vsuRURDBtAXABOA0y1+Vija4Vf9Ix9hufnperXcc/VKZL/nfK7M81aKtsBi1857Q==',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        const chipId = fullText.substring(0, 16);
        const chipCheck = await checkChipExists(chipId);
        if (chipCheck.exists) {
          setDuplicateInfo({
            type: 'chip',
            value: chipId,
            yardName: chipCheck.yardName,
            vin: chipCheck.vehicle.vin,
            vehicleId: chipCheck.vehicle.id
          });
          setShowDuplicateModal(true);
          return;
        }
        await updateVehicleWithChip(chipId);
        await addToHistory('assigned', chipId, 'Chip assigned successfully');
      }
    } catch (error) {
      console.error('Error scanning chip:', error);
    }
  };

  const handleUnassignFromDuplicate = async () => {
    try {
      Alert.alert(
        'Unassign Chip',
        `Are you sure you want to unassign this chip?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              const success = await unassignChipFromVehicle(duplicateInfo?.value, duplicateInfo?.vehicleId);
              setShowDuplicateModal(false);
              if (success) {
                navigation.navigate('YardDetailScreen', {
                  yardName: duplicateInfo?.yardName,
                  yardId: yardId,
                  refreshData: true
                });
              }
            },
          },
        ]
      );
    } catch (error) { }
  };

  const unassignChipFromVehicle = async (chipId, vehicleId) => {
    try {
      const { error } = await supabase
        .from('cars')
        .update({ chip: null })
        .eq('id', vehicleId)
        .select();

      if (error) {
        Toast.show(`Failed to unassign chip: ${error.message}`, Toast.LONG);
        return false;
      }
      await moveChipToInactive(chipId);
      Toast.show('✅ Chip unassigned successfully!', Toast.LONG);
      return true;
    } catch (error) {
      return false;
    }
  };

  // ✅ 2. CORRECT ARROW LOGIC FOR ROTATING MAP
  const renderDirectionArrow = () => {
    if (!getChipId() || !currentLocation || !carLocation) {
      return null;
    }
    // Logic: 
    // Bearing = Angle to Car from North
    // DeviceHeading = Direction phone is pointing
    // Map is rotated by Heading.
    // So "Up" on screen is always where phone points.
    // We just need rotation = Bearing - Heading.
    const rotation = bearingToCar - deviceHeading;

    return (
      <View
        style={[
          styles.directionArrowContainer,
          { transform: [{ rotate: `${rotation}deg` }] }
        ]}
      >
        {/* Using Arrow Up because 0 deg means "Straight Ahead" */}
        <Ionicons name="arrow-up" size={24} color="#ff0000ff" style={{ marginBottom: 35 }} />
      </View>
    );
  };
  const renderHeadingDirection = () => {
    if (!deviceHeading) return null;

    return (
      <View
        style={[
          styles.headingDirectionContainer,
          // { transform: [{ rotate: `${deviceHeading}deg` }] }
        ]}
      >
        {/* Red Dot */}
        {/* <View style={styles.headingRedDot} /> */}

        {/* Triangle Indicator */}
        <View style={styles.headingDirectionInner} />
      </View>
    );
  };


  const renderMap = () => (
    <View style={[styles.mapContainer, isMapFullscreen && styles.mapContainerFullscreen]}>
      {/* Navigation Step Display - Top of Map */}
      {currentStep && (
        <View style={[styles.stepContainer, {
          top: isMapFullscreen ? 50 : 10,
        }]}>
          <View style={styles.stepContent}>
            <Ionicons name="navigate" size={20} color="#fffff" style={styles.stepIcon} />
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepInstruction} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
              {currentStep.distance > 0 && (
                <Text style={styles.stepDistance}>
                  {currentStep.distance < 1000
                    ? `${currentStep.distance}m`
                    : `${(currentStep.distance / 1000).toFixed(1)}km`}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {!getChipId() && (
        <View style={styles.noChipNote}>
          <Text style={styles.noChipText}>📍 Please assign a chip to track vehicle location</Text>
        </View>
      )}

      {/* Fullscreen Toggle Button */}
      <TouchableOpacity
        style={[styles.fullscreenButton, { top: isMapFullscreen ? 60 : 10 }]}
        onPress={() => setIsMapFullscreen(!isMapFullscreen)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isMapFullscreen ? "contract" : "expand"}
          size={24}
          color="#000"
        />
      </TouchableOpacity>

      {/* Map Type Toggle Button */}
      <TouchableOpacity
        style={[styles.mapTypeToggle, { bottom: isMapFullscreen ? 120 : 20, right: 15 }]}
        onPress={() => setMapType(mapType === 'satellite' ? 'standard' : 'satellite')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={mapType === 'satellite' ? 'map-outline' : 'globe-outline'}
          size={20}
          color="#333"
        />
        <Text style={styles.mapTypeToggleText}>
          {mapType === 'satellite' ? 'Standard' : 'Satellite'}
        </Text>
      </TouchableOpacity>

      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false} // Hide default compass as we rotate manually
        rotateEnabled={true}
        initialRegion={{
          latitude: currentLocation?.latitude || carLocation?.latitude || 30.713452,
          longitude: currentLocation?.longitude || carLocation?.longitude || 76.691131,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current position"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={false}
            onPress={handleCurrentLocationMarkerClick}
          >
            <View style={styles.currentLocationContainer}>
              {renderHeadingDirection()}
              <View style={styles.currentLocationPoint} />

              {showUserIcon && (
                <View style={styles.currentLocationMarker}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
              )}
              {renderDirectionArrow()}
            </View>
          </Marker>
        )}

        {/* 🧪 TESTING: Show car marker even without chip ID for testing */}
        {carLocation && (
          <Marker
            coordinate={carLocation}
            title="Vehicle Location"
            description={`${vehicle?.vin || 'Test Vehicle'}`}
          >
            <View style={styles.carMarkerContainer}>
              {savedLocation && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>
                    Last updated: {timeAgo || getTimeAgo(savedLocation.timestamp)}
                  </Text>
                </View>
              )}
              <View style={styles.carLocationMarker}>
                <Ionicons name="car" size={15} color="#fff" />
              </View>
            </View>
          </Marker>
        )}

        {/* 🧪 TESTING: Show route even without chip ID for testing */}
        {currentLocation && carLocation && (
          <MapViewDirections
            key={`route-${currentLocation.latitude}-${currentLocation.longitude}-${carLocation.latitude}-${carLocation.longitude}`}
            origin={currentLocation}
            destination={carLocation}
            apikey="AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI"
            strokeWidth={3}
            strokeColor="#f40d0dff"
            optimizeWaypoints={true}
            onReady={(result) => {
              // Extract route steps
              if (result && result.legs && result.legs.length > 0) {
                const allSteps = [];
                result.legs.forEach(leg => {
                  if (leg.steps) {
                    allSteps.push(...leg.steps);
                  }
                });
                setRouteSteps(allSteps);
                setRouteCoordinates(result.coordinates || []);
                console.log('📍 [STEPS] Route steps loaded:', allSteps.length, 'steps');
              }

              // Zoom to region
              if (mapRef.current && currentLocation && carLocation && !hasZoomedRef.current) {
                const region = calculateMapRegion(currentLocation, carLocation);
                mapRef.current.animateToRegion(region, 1000);
                hasZoomedRef.current = true; // Lock
              }
            }}
            onError={(errorMessage) => {
              console.log('❌ [DIRECTIONS] Error:', errorMessage);
              setRouteSteps([]);
              setCurrentStep(null);
            }}
          />
        )}
      </MapView>
    </View>
  );

  const renderVehicleDetails = () => (
    <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.vehicleInfoCard}>
        <Text style={styles.cardTitle}>Vehicle Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>VIN Number:</Text>
          <Text style={styles.infoValue}>{vehicle?.vin || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Make :</Text>
          <Text style={styles.infoValue}>{vehicle?.make} </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Model:</Text>
          <Text style={styles.infoValue}>{vehicle?.model || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chip Number:</Text>
          <View style={styles.statusContainer}>
            {getChipId() ? (
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: greenColor }]} />
                <Text style={[styles.infoValue, { color: greenColor }]}>{getChipId()}</Text>
              </View>
            ) : (
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: '#ff6b6b' }]} />
                <Text style={[styles.infoValue, { color: '#ff6b6b' }]}>Not Assigned</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Parking Yard:</Text>
          <Text style={styles.infoValue}>{yardName || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: vehicle?.isActive ? greenColor : '#ff6b6b' }]} />
            <Text style={[styles.statusText, { color: vehicle?.isActive ? greenColor : '#ff6b6b' }]}>
              {vehicle?.chipId ? (vehicle?.isActive ? 'Active' : 'Inactive') : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {getChipId() && <View style={styles.locationInfoCard}>
        <Text style={styles.cardTitle}>Location Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distance to Vehicle:</Text>
          <Text style={styles.infoValue}>
            {distanceToCar ?
              `${distanceToCar} meters (${(distanceToCar / 1000).toFixed(2)} km)` :
              'Calculating...'
            }
          </Text>
        </View>
        {savedLocation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Location Updated:</Text>
            <Text style={styles.infoValue}>
              {timeAgo || getTimeAgo(savedLocation.timestamp)}
            </Text>
          </View>
        )}
        {lastUpdateTime && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Refresh Time:</Text>
            <Text style={styles.infoValue}>
              {lastUpdateTime}
            </Text>
          </View>
        )}
      </View>}

      {/* Chip Assignment/Unassignment Buttons */}
      {!vehicle?.chipId ? (
        <TouchableOpacity
          style={styles.assignChipButton}
          onPress={handleAssignChip}
          activeOpacity={0.8}
        >
          <View style={[flexDirectionRow, alignItemsCenter, alignJustifyCenter]}>
            <Ionicons name="radio" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.assignChipButtonText}>Assign Chip</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.unassignChipButton}
          onPress={handleUnassignChip}
          activeOpacity={0.8}
        >
          <View style={[flexDirectionRow, alignItemsCenter, alignJustifyCenter]}>
            <Ionicons name="radio-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.unassignChipButtonText}>Unassign Chip</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* History Section with Tabs */}
      <View style={styles.historyInfoCard}>
        <Text style={styles.cardTitle}>📚 History</Text>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeHistoryTab === 'chip' && styles.activeTab
            ]}
            onPress={() => setActiveHistoryTab('chip')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeHistoryTab === 'chip' && styles.activeTabText
            ]}>
              Chip History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeHistoryTab === 'vehicle' && styles.activeTab
            ]}
            onPress={() => setActiveHistoryTab('vehicle')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeHistoryTab === 'vehicle' && styles.activeTabText
            ]}>
              Vehicle History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chip History Tab Content */}
        {activeHistoryTab === 'chip' && (
          <View style={styles.tabContent}>
            {chipHistory.length > 0 ? (
              chipHistory.map((entry, index) => (
                <View key={index} style={styles.historyEntry}>
                  <View style={styles.historyHeader}>
                    <View style={[
                      styles.historyIcon,
                      {
                        backgroundColor: entry.action === 'assigned' ? greenColor :
                          entry.action === 'vehicle_scanned' ? '#007AFF' : '#ff6b6b'
                      }
                    ]}>
                      <Ionicons
                        name={entry.action === 'assigned' ? 'checkmark' :
                          entry.action === 'vehicle_scanned' ? 'phone-portrait' :
                            'close'}
                        size={16}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyAction}>
                        {entry.action === 'assigned' ? '✅ Assigned' :
                          entry.action === 'unassigned' ? '❌ Unassigned' :
                            entry.action === 'vehicle_scanned' ? '📱 Vehicle Scanned' :
                              '📋 Action'}: {entry.chip_id || entry.vin || 'N/A'}
                      </Text>
                      <Text style={styles.historyTime}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </Text>
                      <Text style={styles.historyUser}>
                        By: {entry.user_name} ({entry.user_email})
                      </Text>
                      {entry.notes && (
                        <Text style={styles.historyNotes}>
                          {entry.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="information-circle-outline" size={48} color={grayColor} />
                <Text style={styles.emptyHistoryText}>
                  No chip history available for this vehicle
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Vehicle History Tab Content */}
        {activeHistoryTab === 'vehicle' && (
          <View style={styles.tabContent}>
            {vehicleHistory.length > 0 ? (
              vehicleHistory.map((entry, index) => {
                const eventText = entry.event === 'left'
                  ? `Left from Slot ${entry.cpSlot || 'N/A'}`
                  : entry.event === 'entered'
                    ? `Entered to Slot ${entry.cpSlot || 'N/A'}`
                    : `${entry.event || 'Event'}`;

                return (
                  <View key={index} style={styles.vehicleHistoryCard}>
                    <View style={styles.vehicleHistoryHeader}>
                      <View style={[
                        styles.vehicleHistoryIcon,
                        {
                          backgroundColor: entry.event === 'left' ? '#ff6b6b' :
                            entry.event === 'entered' ? greenColor : '#007AFF'
                        }
                      ]}>
                        <Ionicons
                          name={entry.event === 'left' ? 'exit-outline' :
                            entry.event === 'entered' ? 'enter-outline' :
                              'information-circle-outline'}
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.vehicleHistoryTitleContainer}>
                        <Text style={styles.vehicleHistoryTitle}>
                          {eventText}
                        </Text>
                        <Text style={styles.vehicleHistoryDate}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.vehicleHistoryBody}>
                      <View style={styles.vehicleHistoryItem}>
                        <Ionicons name="radio" size={16} color="#613EEA" style={styles.vehicleHistoryItemIcon} />
                        <Text style={styles.vehicleHistoryItemLabel}>Chip ID</Text>
                        <Text style={styles.vehicleHistoryItemValue}>{entry.chipId || 'N/A'}</Text>
                      </View>
                      <View style={styles.vehicleHistoryItem}>
                        <Ionicons name="car" size={16} color="#613EEA" style={styles.vehicleHistoryItemIcon} />
                        <Text style={styles.vehicleHistoryItemLabel}>VIN</Text>
                        <Text style={styles.vehicleHistoryItemValue}>{entry.vin || 'N/A'}</Text>
                      </View>
                      <View style={styles.vehicleHistoryItem}>
                        <Ionicons name="location" size={16} color="#613EEA" style={styles.vehicleHistoryItemIcon} />
                        <Text style={styles.vehicleHistoryItemLabel}>Slot</Text>
                        <Text style={styles.vehicleHistoryItemValue}>{entry.cpSlot || 'N/A'}</Text>
                      </View>
                      <View style={styles.vehicleHistoryItem}>
                        <Ionicons name="business" size={16} color="#613EEA" style={styles.vehicleHistoryItemIcon} />
                        <Text style={styles.vehicleHistoryItemLabel}>Facility</Text>
                        <Text style={styles.vehicleHistoryItemValue}>{entry.facilityName || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="information-circle-outline" size={48} color={grayColor} />
                <Text style={styles.emptyHistoryText}>
                  No vehicle history available
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, alignJustifyCenter]}>
        <ActivityIndicator size="large" color="#613EEA" />
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Hidden when map is fullscreen */}
      {!isMapFullscreen && (
        <View style={[styles.header, flexDirectionRow, alignItemsCenter, justifyContentSpaceBetween]}>
          <View style={[flexDirectionRow, alignItemsCenter]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
          </View>
          {/* Refresh Button - Only show if chip is assigned */}
          {getChipId() && (
            <TouchableOpacity
              onPress={handleRefreshLocation}
              style={styles.refreshButton}
              disabled={isRefreshingLocation}
            >
              {isRefreshingLocation ? (
                <ActivityIndicator size="small" color="#613EEA" />
              ) : (
                <Ionicons name="refresh" size={24} color="#613EEA" />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Map Section (30% of screen or fullscreen) */}
      {renderMap()}

      {/* Vehicle Details Section (70% of screen) - Hidden when map is fullscreen */}
      {!isMapFullscreen && renderVehicleDetails()}

      {/* Duplicate Chip Modal */}
      <Modal
        visible={showDuplicateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDuplicateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            {/* Header with Icon */}
            <View style={styles.duplicateModalHeader}>
              <View style={styles.duplicateIconContainer}>
                <Ionicons name="warning" size={40} color="#FF6B6B" />
              </View>
              <Text style={styles.duplicateModalTitle}>Duplicate Chip Found</Text>
            </View>

            {/* Content */}
            <View style={styles.duplicateInfoContainer}>
              <Text style={styles.duplicateMainMessage}>
                This chip is already assigned to a vehicle in
              </Text>

              {/* Yard Name - Bold Text */}
              <Text style={styles.duplicateYardText}>{duplicateInfo?.yardName}</Text>

              {/* VIN Number - Bold Text */}
              <Text style={styles.duplicateVinText}>
                VIN: {duplicateInfo?.vin}
              </Text>

              {/* Chip ID - Bold Text */}
              <Text style={styles.duplicateChipText}>
                Chip: {duplicateInfo?.value}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.duplicateButtonContainer}>
              <TouchableOpacity
                style={styles.duplicateUnassignButton}
                onPress={handleUnassignFromDuplicate}
                activeOpacity={0.8}
              >
                <Ionicons name="radio-outline" size={20} color="#fff" />
                <Text style={styles.duplicateUnassignButtonText}>Unassigned Chip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.duplicateCloseButton}
                onPress={() => setShowDuplicateModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.duplicateCloseButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: whiteColor,
  },
  header: {
    padding: spacings.xxxLarge,
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(1.7),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: spacings.small,
    marginRight: spacings.xxLarge,
  },
  headerTitle: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
  },
  refreshButton: {
    padding: spacings.small,
    marginLeft: spacings.medium,
  },
  loadingText: {
    marginTop: spacings.large,
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
  },
  mapContainer: {
    height: height * 0.28, // 30% of screen height
    width: '100%',
    position: 'relative',
  },
  mapContainerFullscreen: {
    height: height, // Full screen height
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  fullscreenButton: {
    position: 'absolute',
    right: 15,
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  mapTypeToggle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  },
  mapTypeToggleText: {
    marginLeft: 6,
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
  },
  noChipNote: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#FFF5F5',
    padding: spacings.small2x,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    zIndex: 1000,
  },
  noChipText: {
    color: '#FF6B6B',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    textAlign: 'center',
  },
  // Navigation Step Display Styles
  stepContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: 'rgba(254, 254, 254, 1)',
    borderRadius: 12,
    padding: 8,
    zIndex: 1002,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    width: "30%"
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepInstruction: {
    color: '#fffff',
    fontSize: style.fontSizeSmall2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    marginBottom: 4,
  },
  stepDistance: {
    color: '#0004ffff',
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  map: {
    flex: 1,
  },
  currentLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 60,
    height: 60,
  },
  currentLocationPoint: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 999
  },
  currentLocationMarker: {
    position: 'absolute',
    top: -40,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  directionArrowContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  carMarkerContainer: {
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
    minWidth: 150,
  },
  tooltipText: {
    color: '#fff',
    fontSize: style.fontSizeExtraSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    textAlign: 'center',
    lineHeight: 12,
  },
  carLocationMarker: {
    backgroundColor: '#FF6B6B',
    width: 25,
    height: 25,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: spacings.large,
  },
  vehicleInfoCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.xLarge,
    marginVertical: spacings.large,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationInfoCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.xLarge,
    marginBottom: spacings.large,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginBottom: spacings.large,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: spacings.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.medium,
  },
  infoLabel: {
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
    flex: 1,
  },
  infoValue: {
    fontSize: style.fontSizeNormal.fontSize,
    color: blackColor,
    fontWeight: style.fontWeightMedium.fontWeight,
    // flex: 2,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  assignChipButton: {
    backgroundColor: '#613EEA',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xLarge,
    borderRadius: 25,
    marginVertical: spacings.large,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#7B68EE',
  },
  assignChipButtonText: {
    color: whiteColor,
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    letterSpacing: 0.5,
  },
  unassignChipButton: {
    backgroundColor: '#613EEA',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xLarge,
    borderRadius: 25,
    marginVertical: spacings.large,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#7B68EE',
  },
  unassignChipButtonText: {
    color: whiteColor,
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duplicateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacings.none,
    width: '90%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    overflow: 'hidden',
  },
  duplicateModalHeader: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  duplicateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  duplicateModalTitle: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  duplicateInfoContainer: {
    padding: spacings.LargeXX,
  },
  duplicateMainMessage: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  duplicateYardText: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#613EEA',
    textAlign: 'center',
    marginBottom: 16,
  },
  duplicateVinText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateChipText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateButtonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 10,
    justifyContent: 'space-between',
  },
  duplicateUnassignButton: {
    backgroundColor: orangeColor,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    shadowColor: orangeColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  duplicateUnassignButtonText: {
    color: '#fff',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  duplicateCloseButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  // History Styles
  historyInfoCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.xLarge,
    marginVertical: spacings.large,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: hp(13),
  },
  historyEntry: {
    marginBottom: spacings.medium,
    paddingBottom: spacings.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacings.medium,
  },
  historyDetails: {
    flex: 1,
  },
  historyAction: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: blackColor,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    marginBottom: 2,
  },
  historyUser: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    fontStyle: 'italic',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginBottom: spacings.large,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacings.medium + 4,
    paddingHorizontal: spacings.medium,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    transition: 'all 0.3s ease',
  },
  activeTab: {
    backgroundColor: '#613EEA',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  tabText: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#6c757d',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: whiteColor,
    fontWeight: style.fontWeightThin1x.fontWeight,
    letterSpacing: 0.5,
  },
  tabContent: {
    marginTop: spacings.small,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacings.xLarge * 2,
    paddingHorizontal: spacings.large,
  },
  emptyHistoryText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
    textAlign: 'center',
    marginTop: spacings.medium,
    fontStyle: 'italic',
  },
  // Vehicle History Card Styles
  vehicleHistoryCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.medium + 4,
    marginBottom: spacings.medium,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.small + 4,
    paddingBottom: spacings.small + 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleHistoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacings.medium,
  },
  vehicleHistoryTitleContainer: {
    flex: 1,
  },
  vehicleHistoryTitle: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    marginBottom: 2,
  },
  vehicleHistoryDate: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
  },
  vehicleHistoryBody: {
    // gap: spacings.small, // Not supported in RN
  },
  vehicleHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 2,
  },
  vehicleHistoryItemIcon: {
    marginRight: 8,
  },
  vehicleHistoryItemLabel: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    fontWeight: style.fontWeightMedium.fontWeight,
    marginLeft: 4,
    marginRight: 8,
  },
  vehicleHistoryItemValue: {
    fontSize: style.fontSizeSmall.fontSize,
    color: blackColor,
    fontWeight: style.fontWeightMedium.fontWeight,
    flex: 1,
  },
  // ✅ Heading Direction Indicator Styles - Below current location (behind blue dot)
  headingDirectionContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // zIndex: 1,
  },

  headingRedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'red',
    marginBottom: -2,
  },
  headingDirectionInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4A9EFF',
  },

});

export default VehicleDetailsScreen;