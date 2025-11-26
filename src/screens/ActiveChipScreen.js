import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP } from '../utils';
import { vinList } from '../constants/Constants';
import { useFocusEffect } from '@react-navigation/native';
import { getActiveChips, getInactiveChips, moveChipToActive, getBatteryStatus, getTimeAgo } from '../utils/chipManager';
import { supabase } from '../lib/supabaseClient';
import { checkChipOnlineStatusBatch } from '../utils/chipStatusAPI';
import { getMQTTConfig } from '../constants/Constants';
import mqtt from 'mqtt/dist/mqtt';
import { style, spacings } from '../constants/Fonts';
import { blackColor } from '../constants/Color';


const ActiveChipScreen = ({ navigation, route }) => {
  const { type } = route.params;
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [allChips, setAllChips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reassignment modal states
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedChip, setSelectedChip] = useState(null);
  const [yards, setYards] = useState([]);
  const [selectedYard, setSelectedYard] = useState(null);
  const [yardVehicles, setYardVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [reassignStep, setReassignStep] = useState(1); // 1: Select Yard, 2: Select Vehicle

  // MQTT states for battery monitoring
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [batteryData, setBatteryData] = useState({}); // { chipId: { level: 90, timestamp: Date } }


  // Save battery data to local storage (for multiple chips)
  const saveBatteryDataToStorage = async (chipId, batteryLevel, timestamp) => {
    try {
      const key = `battery_data_${chipId}`;
      const data = {
        chipId,
        batteryLevel,
        timestamp: timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Saved battery data for chip ${chipId}: ${batteryLevel}%`);
    } catch (error) {
      console.error('Error saving battery data:', error);
    }
  };

  // Load battery data from local storage
  const loadBatteryDataFromStorage = async (chipIds) => {
    try {
      const batteryMap = {};
      for (const chipId of chipIds) {
        const key = `battery_data_${chipId}`;
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          batteryMap[chipId] = {
            level: parsed.batteryLevel,
            timestamp: parsed.timestamp
          };
        }
      }
      console.log(`📂 Loaded battery data for ${Object.keys(batteryMap).length} chips from storage`);
      return batteryMap;
    } catch (error) {
      console.error('Error loading battery data:', error);
      return {};
    }
  };

  // Initialize MQTT for battery monitoring
  const initializeMqtt = async (activeChips) => {
    if (!activeChips || activeChips.length === 0) {
      console.log('⚠️ No active chips to monitor');
      return;
    }

    console.log('🔄 Initializing MQTT for battery monitoring...');

    const MQTT_CONFIG = getMQTTConfig('lowbattery');
    const client = mqtt.connect(MQTT_CONFIG.host, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      clientId: MQTT_CONFIG.clientId,
      protocolVersion: MQTT_CONFIG.protocolVersion,
    });

    client.on("connect", () => {
      console.log("✅ Connected to MQTT for battery monitoring");
      setMqttConnected(true);

      // Subscribe to battery topic for each active chip
      activeChips.forEach(chip => {
        const batteryTopic = `/device_sensor_data/449810146246400/${chip.chipId}/+/vs/3000`;
        console.log(`🔋 Subscribing to battery topic: ${batteryTopic}`);

        client.subscribe(batteryTopic, (err) => {
          if (err) {
            console.error(`❌ Failed to subscribe to ${batteryTopic}:`, err);
          } else {
            console.log(`✅ Subscribed to battery topic: ${chip.chipId}`);
          }
        });
      });
    });

    client.on("message", async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        // Extract chip ID from topic: /device_sensor_data/449810146246400/2CF7F1C07190019F/0/vs/3000
        const topicParts = topic.split('/');
        const chipId = topicParts[3];
        const batteryLevel = payload.value;
        const timestamp = payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString();

        console.log(`🔋 Battery data received for chip ${chipId}: ${batteryLevel}% at ${timestamp}`);

        // Update batteryData state
        setBatteryData(prev => ({
          ...prev,
          [chipId]: {
            level: batteryLevel,
            timestamp: timestamp
          }
        }));

        // Update allChips state directly for instant UI update
        setAllChips(prevChips => {
          return prevChips.map(chip => {
            if (chip.chipId === chipId) {
              console.log(`✅ Updating UI for chip ${chipId} with battery ${batteryLevel}%`);
              return {
                ...chip,
                batteryLevel: batteryLevel,
                lastBatteryUpdate: timestamp
              };
            }
            return chip;
          });
        });

        // Save to local storage (fallback)
        await saveBatteryDataToStorage(chipId, batteryLevel, timestamp);

        // Also update database
        try {
          const { error: updateError } = await supabase
            .from('cars')
            .update({
              battery_level: batteryLevel,
              last_battery_update: timestamp
            })
            .eq('chip', chipId);

          if (updateError) {
            console.error('❌ Error updating battery in database:', updateError);
          } else {
            console.log(`🔋 ✅ Battery level updated in database: ${chipId} = ${batteryLevel}%`);
          }
        } catch (dbError) {
          console.error('❌ Database update error:', dbError);
        }

      } catch (error) {
        console.error('🔋 ❌ Error parsing MQTT message:', error);
      }
    });

    client.on("error", (error) => {
      console.error("❌ MQTT Error:", error);
      setMqttConnected(false);
    });

    setMqttClient(client);
  };

  // Helper function to parse database timestamp to UTC milliseconds
  const parseDatabaseTimestamp = (dbTimestamp) => {
    if (!dbTimestamp) return null;
    
    try {
      // Database format: "2025-11-12T15:01:07.838" (UTC format, without Z)
      // Or: "2025-11-12 15:01:07.838" (with space)
      // Or: "2025-11-12T15:03:08.142Z" (with Z, already UTC)
      
      // If timestamp ends with Z, it's already UTC
      if (dbTimestamp.endsWith('Z')) {
        return new Date(dbTimestamp).getTime();
      }
      
      // Normalize format: replace space with T if needed
      const timestampStr = dbTimestamp.includes('T') ? dbTimestamp : dbTimestamp.replace(' ', 'T');
      
      // Add Z to make it explicit UTC
      const utcTimestamp = new Date(timestampStr + 'Z').getTime();
      
      return utcTimestamp;
    } catch (error) {
      console.error('Error parsing database timestamp:', error);
      // Fallback to simple parsing
      return new Date(dbTimestamp).getTime();
    }
  };

  // Function to get yard name from facility ID
  const getYardNameFromId = async (facilityId) => {
    try {
      if (!facilityId || facilityId === 'Unknown') return 'Unknown Yard';

      // Get yard name from facility table
      const { data: facilityData, error } = await supabase
        .from('facility')
        .select('name')
        .eq('id', facilityId)
        .single();

      if (error || !facilityData) {
        console.log(`⚠️ Yard name not found for ID: ${facilityId}`);
        return `Yard ${facilityId}`; // Fallback with ID
      }

      return facilityData.name;
    } catch (error) {
      console.error('❌ Error fetching yard name:', error);
      return `Yard ${facilityId}`; // Fallback with ID
    }
  };

  // Load chip data from Supabase database
  const loadChipData = async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 Loading ${type} chips from Supabase...`);

      // Get all cars from Supabase
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*');

      if (carsError) {
        console.error('❌ Error fetching cars from Supabase:', carsError);
        return;
      }

      console.log('✅ Fetched cars from Supabase:', carsData.length);
      console.log('🔍 Sample car data:', carsData[0]);
      console.log('🔍 All car fields:', carsData[0] ? Object.keys(carsData[0]) : 'No data');

      let chipsData = [];

      if (type === 'active') {
        // Get all cars with assigned chips first
        const carsWithChips = carsData.filter(car => {
          const chip = car.chip;
          return chip && chip !== null && chip !== 'NULL' && chip.toString().trim() !== '' && chip.toString().trim() !== 'null';
        });

        console.log(`📋 Found ${carsWithChips.length} cars with assigned chips`);

        // Extract chip IDs for API call
        const chipIds = carsWithChips.map(car => car.chip).filter((chip, index, self) => self.indexOf(chip) === index);

        // Check online status from API
        let onlineStatusMap = {};
        if (chipIds.length > 0) {
          try {
            console.log(`🔄 Calling API to check online status for ${chipIds.length} chips...`);
            onlineStatusMap = await checkChipOnlineStatusBatch(chipIds);
            console.log(`✅ API returned status for ${Object.keys(onlineStatusMap).length} chips`);
          } catch (apiError) {
            console.error('❌ Error calling chip status API:', apiError);
          }
        }

        // Filter only active chips (online_status === 1)
        const activeCars = carsWithChips.filter(car => {
          const chipId = car.chip;
          const status = onlineStatusMap[chipId];
          return status && status.online_status === 1;
        });

        console.log(`✅ Active chips (online_status === 1): ${activeCars.length}`);

        // Get yard names for all unique facility IDs
        const uniqueFacilityIds = [...new Set(activeCars.map(car => car.facilityId))];
        const yardNamesMap = {};

        for (const facilityId of uniqueFacilityIds) {
          yardNamesMap[facilityId] = await getYardNameFromId(facilityId);
        }

        chipsData = activeCars.map(car => ({
          chipId: car.chip,
          vin: car.vin,
          vehicleId: car.id || car.vin,
          make: car.make || 'N/A',
          model: car.model || 'N/A',
          year: car.year || 'N/A',
          yardId: car.facilityId || 'Unknown',
          yardName: yardNamesMap[car.facilityId] || 'Unknown Yard',
          facility: yardNamesMap[car.facilityId] || 'Unknown Yard',
          slotNo: car.slotNo || car.slot || '',
          batteryLevel: null,
          assignedAt: new Date().toISOString(),
          lastLocationUpdate: car.last_location_update || null,
        }));

        console.log(`✅ Active chips (assigned): ${chipsData.length}`);

      } else if (type === 'inactive') {
        // Get all cars with assigned chips first
        const carsWithChips = carsData.filter(car => {
          const chip = car.chip;
          return chip && chip !== null && chip !== 'NULL' && chip.toString().trim() !== '' && chip.toString().trim() !== 'null';
        });

        console.log(`📋 Found ${carsWithChips.length} cars with assigned chips`);

        // Extract chip IDs for API call
        const chipIds = carsWithChips.map(car => car.chip).filter((chip, index, self) => self.indexOf(chip) === index);

        // Check online status from API
        let onlineStatusMap = {};
        if (chipIds.length > 0) {
          try {
            console.log(`🔄 Calling API to check online status for ${chipIds.length} chips...`);
            onlineStatusMap = await checkChipOnlineStatusBatch(chipIds);
            console.log(`✅ API returned status for ${Object.keys(onlineStatusMap).length} chips`);
          } catch (apiError) {
            console.error('❌ Error calling chip status API:', apiError);
          }
        }

        // Filter only inactive chips (online_status === 0)
        const inactiveCars = carsWithChips.filter(car => {
          const chipId = car.chip;
          const status = onlineStatusMap[chipId];
          return status && status.online_status === 0;
        });

        console.log(`❌ Inactive chips (online_status === 0): ${inactiveCars.length}`);

        // Get yard names for all unique facility IDs
        const uniqueFacilityIds = [...new Set(inactiveCars.map(car => car.facilityId))];
        const yardNamesMap = {};

        for (const facilityId of uniqueFacilityIds) {
          yardNamesMap[facilityId] = await getYardNameFromId(facilityId);
        }

        chipsData = inactiveCars.map(car => ({
          chipId: car.chip,
          vin: car.vin,
          vehicleId: car.id || car.vin,
          make: car.make || 'N/A',
          model: car.model || 'N/A',
          year: car.year || 'N/A',
          yardId: car.facilityId || 'Unknown',
          yardName: yardNamesMap[car.facilityId] || 'Unknown Yard',
          facility: yardNamesMap[car.facilityId] || 'Unknown Yard',
          slotNo: car.slotNo || car.slot || '',
          unassignedAt: new Date().toISOString(),
          lastLocationUpdate: car.last_location_update || null,
        }));

        console.log(`✅ Inactive chips (online_status === 0): ${chipsData.length}`);

      } else if (type === 'lowBattery') {
        // Get all cars with assigned chips first
        const carsWithChips = carsData.filter(car => {
          const chip = car.chip;
          return chip && chip !== null && chip !== 'NULL' && chip.toString().trim() !== '' && chip.toString().trim() !== 'null';
        });

        console.log(`📋 Found ${carsWithChips.length} cars with assigned chips`);

        // Extract chip IDs for API call
        const chipIds = carsWithChips.map(car => car.chip).filter((chip, index, self) => self.indexOf(chip) === index);

        // Check online status from API
        let onlineStatusMap = {};
        if (chipIds.length > 0) {
          try {
            console.log(`🔄 Calling API to check online status for ${chipIds.length} chips...`);
            onlineStatusMap = await checkChipOnlineStatusBatch(chipIds);
            console.log(`✅ API returned status for ${Object.keys(onlineStatusMap).length} chips`);
          } catch (apiError) {
            console.error('❌ Error calling chip status API:', apiError);
          }
        }

        // Get ALL chips (active + inactive) for battery monitoring
        // Don't filter by online_status - show battery for all chips with assigned chip
        console.log(`✅ All chips (active + inactive) for battery monitoring: ${carsWithChips.length}`);

        // Get yard names for all unique facility IDs
        const uniqueFacilityIds = [...new Set(carsWithChips.map(car => car.facilityId))];
        const yardNamesMap = {};

        for (const facilityId of uniqueFacilityIds) {
          yardNamesMap[facilityId] = await getYardNameFromId(facilityId);
        }

        chipsData = carsWithChips.map(car => {
          const chipId = car.chip;
          const status = onlineStatusMap[chipId];
          const isActive = status && status.online_status === 1;
          
          return {
            chipId: car.chip,
            vin: car.vin,
            vehicleId: car.id || car.vin,
            make: car.make || 'N/A',
            model: car.model || 'N/A',
            year: car.year || 'N/A',
            yardId: car.facilityId || 'Unknown',
            yardName: yardNamesMap[car.facilityId] || 'Unknown Yard',
            facility: yardNamesMap[car.facilityId] || 'Unknown Yard',
            slotNo: car.slotNo || car.slot || '',
            batteryLevel: car.battery_level || null, // Get from database first
            lastBatteryUpdate: car.last_battery_update || null, // Get from database first
            assignedAt: new Date().toISOString(),
            isActive: isActive, // Add active/inactive status from API
            lastLocationUpdate: car.last_location_update || null,
          };
        });

        // Load battery data from local storage as fallback
        const chipIdsForBattery = chipsData.map(c => c.chipId);
        const storedBatteryData = await loadBatteryDataFromStorage(chipIdsForBattery);

        // Merge battery data with chips (database first, then local storage fallback)
        chipsData = chipsData.map(chip => {
          // First check batteryData state (real-time MQTT)
          const mqttBattery = batteryData[chip.chipId];
          // Then check database data (already in chip.batteryLevel)
          const dbBattery = chip.batteryLevel !== null ? {
            level: chip.batteryLevel,
            timestamp: chip.lastBatteryUpdate
          } : null;
          // Finally check stored data (local storage fallback)
          const storedBattery = storedBatteryData[chip.chipId];

          // Priority: MQTT > Database > Local Storage
          const batteryInfo = mqttBattery || dbBattery || storedBattery;

          if (batteryInfo) {
            return {
              ...chip,
              batteryLevel: batteryInfo.level,
              lastBatteryUpdate: batteryInfo.timestamp
            };
          }

          return chip;
        });

        // Sort chips by battery level (lowest first, nulls last)
        chipsData.sort((a, b) => {
          const batteryA = a.batteryLevel !== null && a.batteryLevel !== undefined ? a.batteryLevel : 999;
          const batteryB = b.batteryLevel !== null && b.batteryLevel !== undefined ? b.batteryLevel : 999;
          return batteryA - batteryB;
        });

        console.log(`🔋 Loaded ${chipsData.length} active chips sorted by battery level`);
        const criticalCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel <= 20).length;
        const normalCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel > 20 && c.batteryLevel <= 60).length;
        const goodCount = chipsData.filter(c => c.batteryLevel !== null && c.batteryLevel > 60).length;
        const unknownCount = chipsData.filter(c => c.batteryLevel === null || c.batteryLevel === undefined).length;
        console.log(`🔋 Battery distribution: Critical=${criticalCount}, Normal=${normalCount}, Good=${goodCount}, Unknown=${unknownCount}`);

        // Initialize MQTT if not already connected
        if (!mqttClient && type === 'lowBattery') {
          console.log('🔄 Starting MQTT connection for battery monitoring...');
          initializeMqtt(chipsData);
        }
      }

      setAllChips(chipsData);
      console.log(`✅ Loaded ${type} chips from Supabase:`, chipsData.length);

    } catch (error) {
      console.error('❌ Error loading chip data from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadChipData();

    // Auto-refresh every 30 seconds for battery updates (not too frequent to avoid re-renders)
    const refreshInterval = setInterval(() => {
      if (type === 'lowBattery') {
        console.log('🔄 Auto-refreshing battery data...');
        loadChipData();
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(refreshInterval);

      // Cleanup MQTT connection when leaving screen
      if (mqttClient) {
        console.log('🔌 Disconnecting MQTT from ActiveChipScreen...');
        mqttClient.end();
        setMqttClient(null);
        setMqttConnected(false);
      }
    };
  }, [type, mqttClient]);

  useFocusEffect(
    React.useCallback(() => {
      loadChipData();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredData(allChips);
    } else {
      const filtered = allChips?.filter(
        item =>
          item.vin?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.chipId?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.make?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.year?.toString().includes(searchText) ||
          item.lastVin?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.lastMake?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.lastModel?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchText, allChips]);

  useEffect(() => {
    setFilteredData(allChips);
  }, [type, allChips]);

  const getHeading = () => {
    switch (type) {
      case 'active':
        return 'Active Chips';
      case 'inactive':
        return 'In-Active Chips';
      case 'lowBattery':
        return 'Battery Status - All Chips';
      default:
        return 'Chips';
    }
  };

  // Load yards for reassignment
  const loadYards = async () => {
    try {
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        setYards(JSON.parse(savedYards));
      }
    } catch (error) {
      console.error('Error loading yards:', error);
    }
  };

  // Load vehicles from a yard - Fetch from Supabase
  const loadYardVehicles = async (yardId) => {
    try {
      console.log('🔄 Loading vehicles for yard:', yardId);

      // Get cars from Supabase that belong to this yard and don't have chips assigned
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .eq('facilityId', yardId)
        .is('chip', null);

      if (carsError) {
        console.error('❌ Error fetching yard vehicles:', carsError);
        setYardVehicles([]);
        return;
      }

      console.log('✅ Fetched vehicles for yard:', carsData.length);

      // Map to the expected vehicle format
      const availableVehicles = carsData.map(car => ({
        id: car.id,
        vin: car.vin,
        make: car.make || 'N/A',
        model: car.model || 'N/A',
        year: car.year || 'N/A',
        color: car.color || 'N/A',
        slotNo: car.slotNo || '',
        chipId: null, // No chip assigned
        isActive: false
      }));

      setYardVehicles(availableVehicles);

    } catch (error) {
      console.error('❌ Error loading yard vehicles:', error);
      setYardVehicles([]);
    }
  };

  // Handle reassignment
  const handleReassignChip = async () => {
    if (!selectedChip || !selectedVehicle || !selectedYard) {
      console.log('Error', 'Please select a yard and vehicle');
      return;
    }

    try {
      console.log('🔄 Assigning chip to vehicle...', {
        chipId: selectedChip.chipId,
        vehicleId: selectedVehicle.id,
        yardId: selectedYard.id
      });

      // Update the car record in Supabase with the assigned chip
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          chip: selectedChip.chipId,
          facilityId: selectedYard.id,
          slotNo: selectedVehicle.slotNo || selectedVehicle.id
        })
        .eq('id', selectedVehicle.id);

      if (updateError) {
        console.error('❌ Error updating car with chip:', updateError);
        return;
      }

      console.log('✅ Chip assigned successfully to vehicle in Supabase!');
      setShowReassignModal(false);
      setReassignStep(1);
      setSelectedChip(null);
      setSelectedYard(null);
      setSelectedVehicle(null);

      // Reload data to reflect changes
      loadChipData();

    } catch (error) {
      console.error('❌ Error assigning chip:', error);
    }
  };

  const renderItem = ({ item, index }) => {
    // Determine if this is an active or inactive chip
    const isInactive = type === 'inactive';
    const isLowBattery = type === 'lowBattery';

    // Debug log for inactive chips
    if (isInactive && index < 2) {
      console.log(`🔍 Inactive chip ${index}:`, {
        vin: item.vin,
        make: item.make,
        model: item.model,
        year: item.year,
        yardName: item.yardName,
        facility: item.facility
      });
    }

    // Get display data - use same fields for both active and inactive
    const displayVin = item.vin || 'N/A';
    const displayMake = item.make || 'N/A';
    const displayModel = item.model || 'N/A';
    const displayYardName = item.yardName || 'N/A';

    // Get battery status
    const batteryStatus = getBatteryStatus(item.batteryLevel);

    // Check if we need to show section header (for lowBattery type)
    const showSectionHeader = isLowBattery && index === 0 ||
      (isLowBattery && index > 0 &&
        getBatteryStatus(filteredData[index - 1].batteryLevel).status !== batteryStatus.status);

    return (
      <View>
        {/* Section Header for Battery Status */}
        {showSectionHeader && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: batteryStatus.color }]} />
            <Text style={styles.sectionTitle}>
              {batteryStatus.status === 'critical'
                ? '❌ Critical Battery (0-20%)'
                : batteryStatus.status === 'normal'
                  ? '⚠️ Normal Battery (20-60%)'
                  : batteryStatus.status === 'good'
                    ? '✅ Good Battery (60-100%)'
                    : '❓ Unknown Battery'}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              // Allow navigation for both active and inactive chips
              if (item?.vehicleId) {
                // Navigate to vehicle details - status will be checked dynamically in VehicleDetailsScreen
                navigation.navigate('VehicleDetailsScreen', {
                  vehicle: {
                    id: item?.vehicleId,
                    vin: item?.vin,
                    make: item?.make,
                    model: item?.model,
                    year: item?.year,
                    chipId: item?.chipId,
                    isActive: !isInactive // Pass current status, will be updated by API
                  },
                  yardName: item?.yardName,
                  yardId: item?.yardId
                });
              }
            }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vin}>{displayVin}</Text>
              <Text style={styles.subText}>
                {displayMake} •  {displayModel}
              </Text>
              <Text style={styles.chipText}>
                {item.chipId ? (
                  <>
                    Chip:{' '}
                    <Text>
                      {item.chipId.slice(0, -3)}
                      <Text style={{ fontSize: 18 }}>
                        {item.chipId.slice(-3)}
                      </Text>
                    </Text>
                  </>
                ) : (
                  'Chip: Not Assigned'
                )}
              </Text>

              <Text style={styles.yardText}>
                {isInactive ? 'Current Yard: ' : 'Yard: '}{displayYardName}
              </Text>

              {/* Last Location Update Display */}
              {item.lastLocationUpdate && (() => {
                const timestamp = parseDatabaseTimestamp(item.lastLocationUpdate);
                if (!timestamp) return null;
                return (
                  <View style={styles.lastUpdateContainer}>
                    <Icon name="time-outline" size={14} color="#999" />
                    <Text style={styles.lastUpdateText}>
                      Last location: {getTimeAgo(timestamp)}
                    </Text>
                  </View>
                );
              })()}

              {/* Battery Level Display for Low Battery Page */}
              {isLowBattery && item.batteryLevel !== null && item.batteryLevel !== undefined && (
                <View style={styles.batteryInfoContainer}>
                  <View style={styles.batteryContainer}>
                    <Icon
                      name={batteryStatus.status === 'critical' ? 'warning' : batteryStatus.status === 'medium' ? 'alert-circle' : 'checkmark-circle'}
                      size={16}
                      color={batteryStatus.color}
                    />
                    <Text style={[styles.batteryText, { color: batteryStatus.color }]}>
                      Battery: {item.batteryLevel}% ({batteryStatus.label})
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Status Tag or Reassign Button */}
          {isInactive ? (
            <View
              style={[
                styles.activeTag,
                {
                  backgroundColor: 'rgba(0, 128, 0, 0.2)',
                },
              ]}>
              <Text
                style={[
                  styles.activeText,
                  {
                    color: 'green',
                  },
                ]}>
                In-Active
              </Text>
            </View>
            // <TouchableOpacity
            //   style={styles.reassignButton}
            //   onPress={async () => {
            //     setSelectedChip(item);
            //     await loadYards();
            //     setShowReassignModal(true);
            //     setReassignStep(1);
            //   }}>
            //   <Icon name="link" size={16} color="#fff" />
            //   <Text style={styles.reassignButtonText}>Assign Vehicle</Text>
            // </TouchableOpacity>
          ) : isLowBattery ? (
            // For low battery screen, show active/inactive status along with battery badge
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* Active/Inactive Status */}
              <View
                style={[
                  styles.activeTag,
                  {
                    backgroundColor: item.isActive ? 'rgba(40, 167, 69, 0.2)' : 'rgba(242, 67, 105, 0.2)',
                  },
                ]}>
                <Text
                  style={[
                    styles.activeText,
                    {
                      color: item.isActive ? '#28a745' : '#F24369',
                    },
                  ]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {/* Battery Badge */}
              <View
                style={[
                  styles.batteryStatusBadge,
                  {
                    backgroundColor: batteryStatus.status === 'critical'
                      ? 'rgba(242, 67, 105, 0.2)'
                      : batteryStatus.status === 'normal'
                        ? 'rgba(242, 137, 61, 0.2)'
                        : 'rgba(69, 198, 79, 0.2)',
                  },
                ]}>
                <Icon
                  name={batteryStatus.status === 'critical' ? 'warning' : batteryStatus.status === 'normal' ? 'alert-circle' : 'checkmark-circle'}
                  size={14}
                  color={batteryStatus.color}
                />
                <Text
                  style={[
                    styles.activeText,
                    {
                      color: batteryStatus.color,
                      marginLeft: 4,
                    },
                  ]}>
                  {batteryStatus.label}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.activeTag,
                {
                  backgroundColor: 'rgba(0, 128, 0, 0.2)',
                },
              ]}>
              <Text
                style={[
                  styles.activeText,
                  {
                    color: 'green',
                  },
                ]}>
                Active
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>{getHeading()}</Text>
        </View>

        {/* Refresh Button for Battery Page */}
        {type === 'lowBattery' && (
          <TouchableOpacity
            onPress={() => {
              console.log('🔄 Manual refresh battery data');
              loadChipData();
            }}
            style={styles.refreshButton}>
            <Icon name="refresh" size={24} color="#613EEA" />
          </TouchableOpacity>
        )}
      </View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search VIN, model, year..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Loading chip data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: heightPercentageToDP(10) }}
          ListEmptyComponent={
            <View style={styles.noDataContainer}>
              <Icon name="battery-charging-outline" size={80} color="#ccc" />
              <Text style={styles.noData}>No {type} chips found</Text>
              <Text style={styles.noDataSubtext}>
                {type === 'active'
                  ? 'No vehicles with active chips'
                  : type === 'inactive'
                    ? 'No vehicles with inactive chips'
                    : 'No active chips available for battery monitoring'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Reassignment Modal */}
      <Modal
        visible={showReassignModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReassignModal(false);
          setReassignStep(1);
          setSelectedChip(null);
          setSelectedYard(null);
          setSelectedVehicle(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reassignStep === 1 ? 'Select Yard' : 'Select Vehicle'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReassignModal(false);
                  setReassignStep(1);
                  setSelectedChip(null);
                  setSelectedYard(null);
                  setSelectedVehicle(null);
                }}>
                <Icon name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Chip Info */}
            <View style={styles.chipInfo}>
              <Text style={styles.chipInfoLabel}>Chip ID:</Text>
              <Text style={styles.chipInfoValue}>{selectedChip?.chipId}</Text>
            </View>

            {/* Step 1: Yard Selection */}
            {reassignStep === 1 && (
              <ScrollView style={styles.modalList}>
                {yards.length > 0 ? (
                  yards.map((yard) => (
                    <TouchableOpacity
                      key={yard.id}
                      style={[
                        styles.listItem,
                        selectedYard?.id === yard.id && styles.selectedListItem,
                      ]}
                      onPress={async () => {
                        setSelectedYard(yard);
                        await loadYardVehicles(yard.id);
                        setReassignStep(2);
                      }}>
                      <Icon name="business" size={24} color="#613EEA" />
                      <View style={styles.listItemText}>
                        <Text style={styles.listItemTitle}>{yard.name}</Text>
                        <Text style={styles.listItemSubtitle}>{yard.address}</Text>
                      </View>
                      <Icon name="chevron-forward" size={24} color="#999" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="business-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyStateText}>No yards available</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Step 2: Vehicle Selection */}
            {reassignStep === 2 && (
              <>
                <View style={styles.backButton}>
                  <TouchableOpacity
                    onPress={() => {
                      setReassignStep(1);
                      setSelectedVehicle(null);
                    }}
                    style={styles.backButtonContainer}>
                    <Icon name="arrow-back" size={20} color="#613EEA" />
                    <Text style={styles.backButtonText}>Back to Yards</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                  {yardVehicles.length > 0 ? (
                    yardVehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.listItem,
                          selectedVehicle?.id === vehicle.id && styles.selectedListItem,
                        ]}
                        onPress={() => {
                          setSelectedVehicle(vehicle);
                        }}>
                        <Icon name="car" size={24} color="#613EEA" />
                        <View style={styles.listItemText}>
                          <Text style={styles.listItemTitle}>{vehicle.vin}</Text>
                          <Text style={styles.listItemSubtitle}>
                            {vehicle.year} • {vehicle.make} {vehicle.model}
                          </Text>
                        </View>
                        {selectedVehicle?.id === vehicle.id && (
                          <Icon name="checkmark-circle" size={24} color="#28a745" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="car-outline" size={60} color="#ccc" />
                      <Text style={styles.emptyStateText}>No available vehicles in this yard</Text>
                      <Text style={styles.emptyStateSubtext}>
                        All vehicles already have chips assigned
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Assign Button */}
                {selectedVehicle && (
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={handleReassignChip}>
                    <Icon name="link" size={20} color="#fff" />
                    <Text style={styles.assignButtonText}>Assign to Vehicle</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    marginVertical: spacings.large,
    paddingHorizontal: spacings.large,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: spacings.normal,
    margin: spacings.large,
    backgroundColor: '#f9f9f9',
    height: Platform.OS === 'ios' ? heightPercentageToDP(5) : heightPercentageToDP(5.5),
  },
  searchInput: {
    flex: 1,
    marginLeft: spacings.small,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacings.large,
    marginHorizontal: spacings.large,
    marginBottom: spacings.small,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vin: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#000',
  },
  subText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color:blackColor,
    marginTop: spacings.xxsmall,
  },
  activeTag: {
    backgroundColor: 'rgba(128, 6, 0, 0.2)', // semi-transparent green
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.xsmall,
    borderRadius: 8,
  },
  activeText: {
    fontWeight: style.fontWeightMedium.fontWeight,
    fontSize: style.fontSizeSmall.fontSize,
  },
  noData: {
    fontSize: style.fontSizeNormal.fontSize,
    textAlign: 'center',
    marginTop: spacings.ExtraLarge2x,
    color: '#999',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacings.ExtraLarge2x,
  },
  noDataSubtext: {
    fontSize: style.fontSizeSmall1x.fontSize,
    textAlign: 'center',
    marginTop: spacings.small,
    color: '#bbb',
    paddingHorizontal: spacings.large,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacings.ExtraLarge2x,
  },
  loadingText: {
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
    marginTop: spacings.small,
  },
  chipText: {
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: 'green',
    marginTop: spacings.xxsmall,
    // fontFamily: 'monospace',
  },
  yardText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#888',
    marginTop: spacings.xxsmall,
  },
  batteryInfoContainer: {
    marginTop: spacings.small,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacings.xsmall,
    paddingHorizontal: spacings.small,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  batteryText: {
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    marginLeft: spacings.small,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacings.xsmall,
    paddingHorizontal: spacings.xsmall,
  },
  lastUpdateText: {
    fontSize: style.fontSizeExtraSmall.fontSize,
    color: '#999',
    marginLeft: spacings.xsmall,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacings.small,
    paddingHorizontal: spacings.large,
    backgroundColor: '#f8f9fa',
    marginTop: spacings.large,
    marginBottom: spacings.large,
    marginHorizontal: spacings.large,
    borderRadius: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: spacings.small,
  },
  sectionTitle: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#333',
    flex: 1,
  },
  batteryStatusBadge: {
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.small,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: spacings.small,
    backgroundColor: '#f3f0ff',
    borderRadius: 8,
    marginLeft: spacings.small,
  },
  mqttStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: spacings.normal,
    paddingVertical: spacings.small,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mqttStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacings.small,
  },
  mqttStatusText: {
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#666',
  },
  reassignButton: {
    backgroundColor: '#613EEA',
    paddingHorizontal: spacings.small,
    paddingVertical: spacings.small,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.small,
  },
  reassignButtonText: {
    color: '#fff',
    fontSize: style.fontSizeSmall.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    marginLeft: spacings.xsmall,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacings.Large1x,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.large,
    paddingBottom: spacings.medium,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#000',
  },
  chipInfo: {
    backgroundColor: '#f8f9fa',
    padding: spacings.medium,
    borderRadius: 12,
    marginBottom: spacings.large,
    borderLeftWidth: 4,
    borderLeftColor: '#613EEA',
  },
  chipInfoLabel: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    marginBottom: spacings.xsmall,
  },
  chipInfoValue: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#000',
    fontFamily: 'monospace',
  },
  modalList: {
    maxHeight: 400,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedListItem: {
    borderColor: '#613EEA',
    borderWidth: 2,
    backgroundColor: '#f3f0ff',
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#613EEA',
    marginLeft: 8,
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: '#613EEA',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ActiveChipScreen;
