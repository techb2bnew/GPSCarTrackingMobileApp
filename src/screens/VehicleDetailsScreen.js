import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import haversine from 'haversine-distance';
import mqtt from "mqtt/dist/mqtt"; // 👈 important for RN
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';

const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const { width, height } = Dimensions.get('window');

const VehicleDetailsScreen = ({ navigation, route }) => {
  const { vehicle: initialVehicle, yardName, yardId } = route?.params || {};
  const [vehicle, setVehicle] = useState(initialVehicle);
  const mapRef = useRef(null);

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

  // Duplicate validation states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  // Mock chip location (in real app, this would come from chip data)
  const mockChipLocation = {
    latitude: 30.713452,
    longitude: 76.691131
  };

  // Mock car location (in real app, this would come from vehicle data)
  const mockCarLocation = {
    latitude: 30.713452,
    longitude: 76.691131
  };

  // MQTT Configuration
  const MQTT_CONFIG = {
    host: 'sensecap-openstream.seeed.cc',
    port: 1883,
    username: 'org-449810146246400',
    password: '9B1C6913197A4C56B5EC31F1CEBAECF9E7C7235B015B456DB0EC577BD7C167F3',
    clientId: 'org-449810146246400-quickstart',
    protocol: 'mqttv311'
  };

  // Get chip ID from vehicle data (device ID)
  const getChipId = () => {
    return vehicle?.chipId || '2CF7F1C07190019F'; // Fallback to default chip ID
  };

  // Check if chip already exists in any yard
  const checkChipExists = async (chipId) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const keys = await AsyncStorage.getAllKeys();
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));
      
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          const foundVehicle = parsedVehicles.find(v => v.chipId === chipId);
          
          if (foundVehicle) {
            const foundYardId = key.replace('yard_', '').replace('_vehicles', '');
            
            // Get actual yard name from parking_yards
            const savedYards = await AsyncStorage.getItem('parking_yards');
            let actualYardName = `Yard ${foundYardId}`; // fallback
            
            if (savedYards) {
              const yards = JSON.parse(savedYards);
              const yard = yards.find(y => y.id === foundYardId);
              if (yard) {
                actualYardName = yard.name;
              }
            }
            
            return { exists: true, vehicle: foundVehicle, yardName: actualYardName };
          }
        }
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking chip existence:', error);
      return { exists: false };
    }
  };

  // Parse MQTT data to extract coordinates
  const parseMqttData = (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('MQTT Data received:', data);

      // Extract latitude and longitude from the data
      // The exact structure depends on your API response
      let latitude, longitude;

      if (data.latitude && data.longitude) {
        latitude = parseFloat(data.latitude);
        longitude = parseFloat(data.longitude);
      } else if (data.coordinates) {
        latitude = parseFloat(data.coordinates.latitude);
        longitude = parseFloat(data.coordinates.longitude);
      } else if (data.location) {
        latitude = parseFloat(data.location.lat);
        longitude = parseFloat(data.location.lng);
      } else if (data.lat && data.lng) {
        latitude = parseFloat(data.lat);
        longitude = parseFloat(data.lng);
      }

      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        const newChipLocation = { latitude, longitude };
        setChipLocation(newChipLocation);
        setMqttDataReceived(true);

        console.log('Updated chip location from MQTT:', newChipLocation);

        // Update last update time
        setLastUpdateTime(new Date().toLocaleTimeString());

        // Recalculate distance if current location is available
        if (currentLocation) {
          const distance = calculateDistance(currentLocation, newChipLocation);
          setDistanceToCar(distance);
        }

        // Update map region to include new chip location
        if (mapRef.current && currentLocation) {
          const region = calculateMapRegion(currentLocation, newChipLocation);
          mapRef.current.animateToRegion(region, 1000);
        }

        return true;
      }
    } catch (error) {
      console.error('Error parsing MQTT data:', error);
    }
    return false;
  };

  // Initialize MQTT connection
  const initializeMqtt = () => {
    try {
      const client = mqtt.connect(MQTT_CONFIG);

      client.on('connect', () => {
        console.log('MQTT Connected to SenseCAP');
        setMqttConnected(true);

        // Subscribe to the chip location topics
        const chipId = getChipId();
        const topics = [
          `/device_sensor_data/449810146246400/${chipId}/+/vs/4197`,
          `/device_sensor_data/449810146246400/${chipId}/+/vs/4198`
        ];

        topics.forEach(topic => {
          client.subscribe(topic, (err) => {
            if (err) {
              console.error('MQTT Subscribe error:', err);
            } else {
              console.log(`Subscribed to topic: ${topic}`);
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        console.log(`MQTT Message received on topic: ${topic}`);
        parseMqttData(topic, message);
      });

      client.on('error', (error) => {
        console.error('MQTT Error:', error);
        setMqttConnected(false);
      });

      client.on('close', () => {
        console.log('MQTT Connection closed');
        setMqttConnected(false);
      });

      setMqttClient(client);

    } catch (error) {
      console.error('MQTT Initialization error:', error);
      setMqttConnected(false);
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show your position on the map.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermission(true);
          return true;
        } else {
          setLocationPermission(false);
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      setLocationPermission(true);
      return true;
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return null;

    try {
      // Try using haversine-distance package
      const distance = haversine(
        { lat: point1.latitude, lng: point1.longitude },
        { lat: point2.latitude, lng: point2.longitude }
      );
      return Math.round(distance); // Distance in meters
    } catch (error) {
      console.log('Haversine error, using manual calculation:', error);

      // Fallback: Manual Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = point1.latitude * Math.PI / 180;
      const φ2 = point2.latitude * Math.PI / 180;
      const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
      const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // Distance in meters
      return Math.round(distance);
    }
  };

  // Calculate optimal map region to show all locations
  const calculateMapRegion = (currentLoc, carLoc) => {
    if (!currentLoc || !carLoc) {
      return {
        latitude: currentLoc?.latitude || 30.713452,
        longitude: currentLoc?.longitude || 76.691131,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // Calculate bounds to include both locations
    const minLat = Math.min(currentLoc.latitude, carLoc.latitude);
    const maxLat = Math.max(currentLoc.latitude, carLoc.latitude);
    const minLng = Math.min(currentLoc.longitude, carLoc.longitude);
    const maxLng = Math.max(currentLoc.longitude, carLoc.longitude);

    // Add padding to the bounds
    const latPadding = (maxLat - minLat) * 0.3; // 30% padding
    const lngPadding = (maxLng - minLng) * 0.3;

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Ensure minimum delta values for better zoom
    const latDelta = Math.max((maxLat - minLat) + latPadding, 0.005);
    const lngDelta = Math.max((maxLng - minLng) + lngPadding, 0.005);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  // Get current location
  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCurrentLocation = { latitude, longitude };
        setCurrentLocation(newCurrentLocation);

        // Set chip location from MQTT data if available, otherwise use mock data
        if (!mqttDataReceived) {
          setChipLocation(mockChipLocation);
        }
        setCarLocation(mockCarLocation);

        // Calculate distance to car
        const distance = calculateDistance(newCurrentLocation, mockCarLocation);
        setDistanceToCar(distance);

        // Set last update time
        setLastUpdateTime(new Date().toLocaleTimeString());

        setIsLoading(false);

        // Calculate optimal region and animate to it
        if (mapRef.current) {
          const region = calculateMapRegion(newCurrentLocation, mockCarLocation);
          mapRef.current.animateToRegion(region, 1500);
        }
      },
      (error) => {
        console.log('Location error:', error);
        setIsLoading(false);
        // Set mock locations if permission denied
        const mockCurrentLocation = { latitude: 30.7093774, longitude: 76.6921674 };
        setCurrentLocation(mockCurrentLocation);
        setChipLocation(mockChipLocation);
        setCarLocation(mockCarLocation);

        // Calculate distance with mock location
        const distance = calculateDistance(mockCurrentLocation, mockCarLocation);
        setDistanceToCar(distance);

        // Set last update time
        setLastUpdateTime(new Date().toLocaleTimeString());

        // Calculate optimal region and animate to it for mock locations too
        if (mapRef.current) {
          const region = calculateMapRegion(mockCurrentLocation, mockCarLocation);
          mapRef.current.animateToRegion(region, 1500);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Initialize location tracking and MQTT
  useEffect(() => {
    const initializeLocation = async () => {
      // Initialize MQTT connection first
      initializeMqtt();

      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        getCurrentLocation();
      } else {
        // Use mock locations if permission denied
        const mockCurrentLocation = { latitude: 30.7093774, longitude: 76.6921674 };
        setCurrentLocation(mockCurrentLocation);
        setChipLocation(mockChipLocation);
        setCarLocation(mockCarLocation);
        setIsLoading(false);

        // Calculate distance with mock location
        const distance = calculateDistance(mockCurrentLocation, mockCarLocation);
        setDistanceToCar(distance);

        // Set last update time
        setLastUpdateTime(new Date().toLocaleTimeString());

        // Animate to optimal region after a short delay to ensure map is ready
        setTimeout(() => {
          if (mapRef.current) {
            const region = calculateMapRegion(mockCurrentLocation, mockCarLocation);
            mapRef.current.animateToRegion(region, 1500);
          }
        }, 500);
      }
    };

    initializeLocation();

    // Set up location updates every 30 seconds
    const locationInterval = setInterval(() => {
      if (locationPermission) {
        getCurrentLocation();
      }
    }, 30000);

    return () => {
      clearInterval(locationInterval);
      // Disconnect MQTT client on cleanup
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, [locationPermission]);

  // Handle initial zoom when both locations are available
  useEffect(() => {
    if (currentLocation && carLocation && mapRef.current && !isLoading) {
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        const region = calculateMapRegion(currentLocation, carLocation);
        mapRef.current.animateToRegion(region, 1000);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [currentLocation, carLocation, isLoading]);

  // Update vehicle with chip ID in AsyncStorage
  const updateVehicleWithChip = async (chipId) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Get the yard ID from route params or vehicle data
      const currentYardId = yardId || vehicle?.parkingYard || 1;
      const storageKey = `yard_${currentYardId}_vehicles`;
      
      // Get existing vehicles from storage
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      if (savedVehicles) {
        const vehicles = JSON.parse(savedVehicles);
        
        // Find and update the vehicle
        const updatedVehicles = vehicles.map(v => {
          if (v.id === vehicle.id || v.vin === vehicle.vin) {
            return {
              ...v,
              chipId: chipId,
              isActive: chipId ? true : false, // Set active only if chipId is provided
              lastUpdated: new Date().toISOString()
            };
          }
          return v;
        });
        
        // Save updated vehicles back to storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedVehicles));
        
        // Update the local vehicle state to reflect the change
        const updatedVehicle = {
          ...vehicle,
          chipId: chipId,
          isActive: chipId ? true : false,
          lastUpdated: new Date().toISOString()
        };
        
        // Update the vehicle state so the UI reflects the change immediately
        // This will cause the component to re-render and show the assigned chip
        setVehicle(updatedVehicle);
        
        console.log(chipId ? `Vehicle updated with chip: ${chipId}` : 'Chip unassigned from vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle with chip:', error);
    }
  };

  // Handle unassign chip
  const handleUnassignChip = async () => {
    try {
      Alert.alert(
        'Unassign Chip',
        'Are you sure you want to unassign this chip? The vehicle will become inactive.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Unassign',
            style: 'destructive',
            onPress: async () => {
              await updateVehicleWithChip(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error unassigning chip:', error);
    }
  };

  // Handle unassigned chip assignment
  const handleAssignChip = async () => {
    try {
      // Import barcode scanner for chip scanning
      const { BarcodeScanner, EnumScanningMode, EnumResultStatus } = require('dynamsoft-capture-vision-react-native');

      const config = {
        license: 't0105HAEAADcNHV64OJlipcqCx3exOR+gSUqL7YqPqsz7SETM98L2Lvx6wS622L8kpqIvn+Jy7Y7dR1SpS4fQIOlJgnXwUlXbAF3cfFzzoBne6J2Tas81yMvxzdMpCv+dSl9nXy279wYdTDrk;t0109HAEAAJRt4MPEuaQhDlCa6yhda0j07Z/FYbFCd65Ty9mXDgoozD8MgTXwcxZlT+cz8Keo0zcHr2z3xne26lirx+S2TPkgLgCnAYbYvK+paIY7esaO4fu5Bfl3PHN1isx7p/zpHJvJbPQNKuw68w==',
        scanningMode: EnumScanningMode.SM_SINGLE,
      };

      const result = await BarcodeScanner.launch(config);

      if (result.resultStatus === EnumResultStatus.RS_FINISHED && result.barcodes?.length) {
        const fullText = result.barcodes[0].text;
        const chipId = fullText.substring(0, 16);

        // Check if chip already exists in any yard
        const chipCheck = await checkChipExists(chipId);
        if (chipCheck.exists) {
          setDuplicateInfo({
            type: 'chip',
            value: chipId,
            yardName: chipCheck.yardName,
            vin: chipCheck.vehicle.vin
          });
          setShowDuplicateModal(true);
          return;
        }

        // Update the vehicle with the new chip ID
        await updateVehicleWithChip(chipId);
      } else {
        console.log('Info', 'Chip scanning cancelled');
      }
    } catch (error) {
      console.error('Error scanning chip:', error);
    }
  };

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="standard"
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: currentLocation?.latitude || 30.713452,
          longitude: currentLocation?.longitude || 76.691131,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current position"
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          </Marker>
        )}


        {/* Car Location Marker */}
        {carLocation && (
          <Marker
            coordinate={carLocation}
            title="Vehicle Location"
            description={`${vehicle?.make} ${vehicle?.model}`}
          >
            <View style={styles.carLocationMarker}>
              <Ionicons name="car" size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {currentLocation && carLocation && (
          <MapViewDirections
            origin={currentLocation}
            destination={carLocation}
            apikey="AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI"
            strokeWidth={3}
            strokeColor="#f40d0dff"
            optimizeWaypoints={true}
            onReady={(result) => {
              console.log('Directions ready:', result);
            }}
            onError={(errorMessage) => {
              console.log('Directions error:', errorMessage);
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
          <Text style={styles.infoLabel}>Make & Model:</Text>
          <Text style={styles.infoValue}>{vehicle?.make} {vehicle?.model}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Year:</Text>
          <Text style={styles.infoValue}>{vehicle?.year || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chip Number:</Text>
          <View style={styles.statusContainer}>
            {vehicle?.chipId ? (
              <>
                <Text style={[styles.infoValue, { color: greenColor }]}>{vehicle.chipId}</Text>
                <View style={[styles.statusDot, { backgroundColor: greenColor }]} />
              </>
            ) : (
              <>
                <Text style={[styles.infoValue, { color: '#ff6b6b' }]}>Not Assigned</Text>
                <View style={[styles.statusDot, { backgroundColor: '#ff6b6b' }]} />
              </>
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
              {vehicle?.chipId ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.locationInfoCard}>
        <Text style={styles.cardTitle}>Location Information</Text>

        {/* <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Location:</Text>
          <Text style={styles.infoValue}>
            {currentLocation ? 
              `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : 
              'Getting location...'
            }
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Chip Location:</Text>
          <Text style={styles.infoValue}>
            {chipLocation ? 
              `${chipLocation.latitude.toFixed(6)}, ${chipLocation.longitude.toFixed(6)}` : 
              'Not available'
            }
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vehicle Location:</Text>
          <Text style={styles.infoValue}>
            {carLocation ? 
              `${carLocation.latitude.toFixed(6)}, ${carLocation.longitude.toFixed(6)}` : 
              'Not available'
            }
          </Text>
        </View> */}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Distance to Vehicle:</Text>
          <Text style={styles.infoValue}>
            {distanceToCar ?
              `${distanceToCar} meters (${(distanceToCar / 1000).toFixed(2)} km)` :
              'Calculating...'
            }
          </Text>
        </View>
        {/* 
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data Source:</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: mqttDataReceived ? greenColor : '#ff9500' }]} />
            <Text style={[styles.statusText, { color: mqttDataReceived ? greenColor : '#ff9500' }]}>
              {mqttDataReceived ? 'Live GPS Data' : 'Static Data'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MQTT Status:</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: mqttConnected ? greenColor : '#ff6b6b' }]} />
            <Text style={[styles.statusText, { color: mqttConnected ? greenColor : '#ff6b6b' }]}>
              {mqttConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View> */}
      </View>

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
      {/* Header */}
      <View style={[styles.header, flexDirectionRow, alignItemsCenter]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
      </View>

      {/* Map Section (30% of screen) */}
      {renderMap()}

      {/* Vehicle Details Section (70% of screen) */}
      {renderVehicleDetails()}

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

            {/* Close Button */}
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
    paddingTop: 50,
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
  loadingText: {
    marginTop: spacings.large,
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
  },
  mapContainer: {
    height: height * 0.3, // 30% of screen height
    width: '100%',
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chipLocationMarker: {
    backgroundColor: '#FF9500',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  carLocationMarker: {
    backgroundColor: '#34C759',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    fontWeight: '600',
    flex: 2,
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
    fontWeight: '600',
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
    backgroundColor: '#FF6B6B',
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xLarge,
    borderRadius: 25,
    marginVertical: spacings.large,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#FF5252',
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
    padding: 0,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  duplicateInfoContainer: {
    padding: 24,
  },
  duplicateMainMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  duplicateYardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#613EEA',
    textAlign: 'center',
    marginBottom: 16,
  },
  duplicateVinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateChipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  duplicateCloseButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  duplicateCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default VehicleDetailsScreen;
