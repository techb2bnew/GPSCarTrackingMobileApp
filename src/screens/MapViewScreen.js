import { Pressable, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, PermissionsAndroid, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import ParkingMap from '../components/ParkingMap';
import { SingleVehInparkingYard, parkingYards } from '../constants/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import ParkingMap1 from '../components/ParkingMap1';
import ActiveChipsMap from '../components/ActiveChipsMap';
import { fetchActiveChipsWithLocations, startLocationSubscription, supabase } from '../lib/supabaseClient';
import Geolocation from '@react-native-community/geolocation';
import mqtt from 'mqtt/dist/mqtt';
import { spacings, style } from '../constants/Fonts';


const MapViewScreen = ({ navigation }) => {
  const [feeds, setFeeds] = useState([]);
  const [activeChips, setActiveChips] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationSubscription, setLocationSubscription] = useState(null);

  // MQTT states for location updates
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);

  // MQTT Configuration for location data
  const MQTT_CONFIG = {
    host: "ws://sensecap-openstream.seeed.cc:8083/mqtt",
    username: "org-449810146246400",
    password: "9B1C6913197A4C56B5EC31F1CEBAECF9E7C7235B015B456DB0EC577BD7C167F3",
    clientId: "org-449810146246400-map-" + Math.random().toString(16).substr(2, 8),
    protocolVersion: 4,
  };

  useEffect(() => {
    initializeMap();
    return () => {
      // Cleanup subscription on unmount
      if (locationSubscription) {
        locationSubscription.unsubscribe();
      }
      // Cleanup MQTT connection
      if (mqttClient) {
        console.log('Disconnecting MQTT client from MapViewScreen...');
        mqttClient.end();
        setMqttClient(null);
        setMqttConnected(false);
      }
    };
  }, []);

  const initializeMap = async () => {
    try {
      setIsLoading(true);

      // Request location permissions on Android
      if (Platform.OS === 'android') {
        await requestLocationPermission();
      }

      // Get current location
      getCurrentLocation();

      // Fetch active chips with locations
      await fetchActiveChips();

      // Initialize MQTT for location updates
      initializeMqtt();

      // Start real-time subscription
      startRealTimeUpdates();

      // Fetch feeds data (existing)
      await fetchData();

    } catch (error) {
      console.error('❌ [MAP] Error initializing map:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (hasPermission) {
          console.log('✅ [MAP] Location permission already granted');
          return true;
        }

        // Request permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show your current position on the map.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ [MAP] Location permission granted');
          return true;
        } else {
          console.log('❌ [MAP] Location permission denied');
          Alert.alert(
            'Permission Required',
            'Location permission is required to show your current position on the map. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Settings', onPress: () => {
                  // You can add logic to open app settings here
                  console.log('User wants to go to settings');
                }
              }
            ]
          );
          return false;
        }
      }
      return true; // iOS doesn't need explicit permission request
    } catch (error) {
      console.error('❌ [MAP] Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = () => {
    console.log('📍 [MAP] Getting current location...');

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ [MAP] Current location obtained:', { latitude, longitude });
        setCurrentLocation({ latitude, longitude });
      },
      (error) => {
        console.error('❌ [MAP] Error getting current location:', error);
        console.error('❌ [MAP] Error code:', error.code);
        console.error('❌ [MAP] Error message:', error.message);

        // Handle different error types
        if (error.code === 3) { // TIMEOUT
          console.log('⏰ [MAP] Location request timed out, trying alternative method...');
          getCurrentLocationAlternative();
        } else if (error.code === 1) { // PERMISSION_DENIED
          console.log('🚫 [MAP] Permission denied, requesting again...');
          requestLocationPermission().then(() => {
            // Retry after permission request
            setTimeout(() => getCurrentLocation(), 1000);
          });
        } else if (Platform.OS === 'android') {
          console.log('🔄 [MAP] Trying alternative location method for Android...');
          getCurrentLocationAlternative();
        } else {
          // Set default location (Delhi) if geolocation fails on iOS
          // setCurrentLocation({
          //   latitude: 28.6139,
          //   longitude: 77.2090,
          // });
        }
      },
      {
        enableHighAccuracy: false, // Start with lower accuracy for Android
        timeout: Platform.OS === 'android' ? 30000 : 10000, // 30 seconds for Android
        maximumAge: Platform.OS === 'android' ? 0 : 60000, // Always fresh for Android
        distanceFilter: 0, // No distance filter
      }
    );
  };

  const getCurrentLocationAlternative = () => {
    console.log('📍 [MAP] Trying alternative location method...');

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ [MAP] Alternative location obtained:', { latitude, longitude });
        setCurrentLocation({ latitude, longitude });
      },
      (error) => {
        console.error('❌ [MAP] Alternative location also failed:', error);
        console.error('❌ [MAP] Alternative error code:', error.code);

        // Try one more time with even more relaxed settings
        if (error.code === 3) { // Still timeout
          console.log('🔄 [MAP] Trying third attempt with very relaxed settings...');
          getCurrentLocationThirdAttempt();
        } else {
          // Only set default location as last resort
          console.log('⚠️ [MAP] Setting default location as last resort');
          // setCurrentLocation({
          //   latitude: 28.6139,
          //   longitude: 77.2090,
          // });
        }
      },
      {
        enableHighAccuracy: false, // Try with lower accuracy
        timeout: 45000, // 45 seconds timeout
        maximumAge: 300000, // 5 minutes old location is okay
        distanceFilter: 100, // 100 meters filter
      }
    );
  };

  const getCurrentLocationThirdAttempt = () => {
    console.log('📍 [MAP] Third attempt with very relaxed settings...');

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ [MAP] Third attempt location obtained:', { latitude, longitude });
        setCurrentLocation({ latitude, longitude });
      },
      (error) => {
        console.error('❌ [MAP] All location attempts failed:', error);
        console.log('⚠️ [MAP] Setting default location as final fallback');
        // setCurrentLocation({
        //   latitude: 28.6139,
        //   longitude: 77.2090,
        // });
      },
      {
        enableHighAccuracy: false,
        timeout: 60000, // 1 minute timeout
        maximumAge: 600000, // 10 minutes old location is okay
        distanceFilter: 500, // 500 meters filter
      }
    );
  };

  const fetchActiveChips = async () => {
    try {
      console.log('🚗 [MAP] Fetching active chips...');
      const chips = await fetchActiveChipsWithLocations();
      setActiveChips(chips);
      console.log('✅ [MAP] Active chips loaded:', chips.length);
    } catch (error) {
      console.error('❌ [MAP] Error fetching active chips:', error);
    }
  };

  // Initialize MQTT for location updates
  const initializeMqtt = async () => {
    try {
      console.log('🔗 [MAP] Initializing MQTT for location updates...');

      const client = mqtt.connect(MQTT_CONFIG.host, {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clientId: MQTT_CONFIG.clientId,
        protocolVersion: MQTT_CONFIG.protocolVersion,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
      });

      client.on("connect", () => {
        console.log('✅ [MAP] MQTT connected for location updates');
        setMqttConnected(true);

        // Subscribe to location topics for all active chips
        const chipIds = activeChips.map(chip => chip.chip || chip.chip_id).filter(Boolean);
        chipIds.forEach(chipId => {
          const locationTopic = `/device_sensor_data/449810146246400/${chipId}/0/location`;
          client.subscribe(locationTopic, (err) => {
            if (err) {
              console.error(`❌ [MAP] Error subscribing to ${locationTopic}:`, err);
            } else {
              console.log(`✅ [MAP] Subscribed to location updates for chip: ${chipId}`);
            }
          });
        });
      });

      client.on("message", async (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());

          // Process location updates (topic format: /device_sensor_data/449810146246400/{chipId}/0/location)
          if (topic.includes('/location')) {
            const topicParts = topic.split('/');
            const chipId = topicParts[3];

            if (payload.latitude && payload.longitude) {
              console.log(`📍 [MAP] Location update for chip ${chipId}:`, payload);

              // Update location in Supabase
              const { error: updateError } = await supabase
                .from('cars')
                .update({
                  latitude: payload.latitude,
                  longitude: payload.longitude,
                  last_location_update: new Date().toISOString()
                })
                .eq('chip', chipId);

              if (updateError) {
                console.error('❌ [MAP] Error updating location in database:', updateError);
              } else {
                console.log(`📍 [MAP] Location updated in database for chip: ${chipId}`);

                // Update local state for immediate UI update
                setActiveChips(prevChips =>
                  prevChips.map(chip =>
                    (chip.chip === chipId || chip.chip_id === chipId)
                      ? {
                        ...chip,
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        last_location_update: new Date().toISOString()
                      }
                      : chip
                  )
                );
              }
            }
          }
        } catch (error) {
          console.error('🔋 ❌ [MAP] Error parsing MQTT message:', error);
        }
      });

      client.on("error", (error) => {
        console.error("❌ [MAP] MQTT Error:", error);
        setMqttConnected(false);
      });

      setMqttClient(client);
    } catch (error) {
      console.error('❌ [MAP] Error initializing MQTT:', error);
    }
  };

  const startRealTimeUpdates = () => {
    console.log('🔔 [MAP] Starting real-time updates...');

    const subscription = startLocationSubscription((updatedChip) => {
      console.log('📍 [MAP] Real-time location update:', updatedChip);

      // Update the chip in our state
      setActiveChips(prevChips =>
        prevChips.map(chip =>
          chip.id === updatedChip.id
            ? { ...chip, ...updatedChip }
            : chip
        )
      );
    });

    setLocationSubscription(subscription);
  };

  const handleChipPress = (chip) => {
    console.log('🚗 [MAP] Chip pressed:', chip);
  };

  const handleViewDetail = async (chip) => {
    console.log('👁️ [MAP] View detail pressed for chip:', chip);

    try {
      // Fetch complete vehicle data from Supabase
      const { data: vehicleData, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', chip.id)
        .single();

      if (error) {
        console.error('❌ [MAP] Error fetching vehicle data:', error);
        return;
      }

      console.log('✅ [MAP] Complete vehicle data fetched:', vehicleData);

      // Get yard name from facility ID
      let yardName = chip.yard_name || 'Unknown Yard';
      if (vehicleData.facilityId && !chip.yard_name) {
        const { data: facilityData } = await supabase
          .from('facility')
          .select('name')
          .eq('id', vehicleData.facilityId)
          .single();
        yardName = facilityData?.name || `Yard ${vehicleData.facilityId}`;
      }

      // Navigate to vehicle details page with complete data
      navigation.navigate('VehicleDetailsScreen', {
        // Complete vehicle object
        vehicle: {
          id: vehicleData.id,
          vin: vehicleData.vin,
          chip: vehicleData.chip,
          chipId: vehicleData.chip,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          slotNo: vehicleData.slotNo,
          trackerNo: vehicleData.trackerNo,
          facilityId: vehicleData.facilityId,
          battery_level: vehicleData.battery_level,
          last_battery_update: vehicleData.last_battery_update,
          last_location_update: vehicleData.last_location_update,
          latitude: vehicleData.latitude,
          longitude: vehicleData.longitude,
          history: vehicleData.history,
          status: vehicleData.status,
          assignedDate: vehicleData.assignedDate
        },
        // Yard information
        yardId: vehicleData.facilityId,
        yardName: yardName,
        // Additional info
        fromMap: true
      });
    } catch (error) {
      console.error('❌ [MAP] Error in handleViewDetail:', error);
    }
  };

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
    <View style={{ flex: 1 }}>
      {/* <Header title="Home" backArrow={true} /> */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.notificationIcon}>
        <Ionicons name="arrow-back" size={32} color="black" />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      ) : (
        <ActiveChipsMap
          activeChips={activeChips}
          currentLocation={currentLocation}
          onChipPress={handleChipPress}
          onViewDetail={handleViewDetail}
          style={{ flex: 1 }}
        />
      )}

      {/* Keep original ParkingMap1 as fallback if needed */}
      {/* <ParkingMap1
        parkingYards={parkingYards}
        single={true}
        home={true}
      /> */}

    </View>
  );
};

export default MapViewScreen;

const styles = StyleSheet.create({
  notificationIcon: {
    position: 'absolute',
    left: wp(2),
    top: Platform.OS === 'ios' ? hp(7) : hp(1),
    width: wp(15),
    height: wp(15),
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: spacings.normal,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
});
