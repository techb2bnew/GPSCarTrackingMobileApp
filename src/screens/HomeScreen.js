import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-simple-toast';
import mqtt from 'mqtt/dist/mqtt';
import { supabase } from '../lib/supabaseClient';
import { getChipCounts, getCriticalBatteryChips, updateChipBatteryLevel, getActiveChips } from '../utils/chipManager';
import {
  ACTIVE,
  BATTERY,
  INACTIVE,
  MAP_ICON,
  MAP_IMAGE,
  NOTIFICATION,
  VEHICLE_REG,
} from '../assests/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DrawerMenu from '../components/DrawerMenu';
import ParkingMap from '../components/ParkingMap';
import { parkingYards } from '../constants/Constants';
import {
  heightPercentageToDP,
  heightPercentageToDP as hp,
  widthPercentageToDP,
  widthPercentageToDP as wp,
} from '../utils';
import { useFocusEffect } from '@react-navigation/native';
import ParkingYardScreen from './ParkingYardScreen';
import { blackColor, blackOpacity5, darkgrayColor, grayColor, redColor, whiteColor } from '../constants/Color';
import { spacings, style } from '../constants/Fonts';

// Dynamic card data function
const getCardData = (chipStats) => [
  {
    id: 1,
    icon: ACTIVE,
    text: 'Active Chips',
    backgroundColor: '#F2893D',
    count: chipStats.activeChips,
    type: 'active',
  },
  {
    id: 2,
    icon: INACTIVE,
    text: 'In-Active Chips',
    backgroundColor: '#F24369',
    count: chipStats.inactiveChips,
    type: 'inactive',
  },
  {
    id: 3,
    icon: BATTERY,
    text: 'Low Battery Chips',
    backgroundColor: '#45C64F',
    count: chipStats.lowBatteryChips,
    type: 'lowBattery',
  },
];
export default function HomeScreen({ navigation, setCheckUser }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedYard, setSelectedYard] = useState(null);

  // Dynamic yards state
  const [yards, setYards] = useState([]);
  const [showAddYardModal, setShowAddYardModal] = useState(false);
  const [editingYard, setEditingYard] = useState(null);
  const [yardName, setYardName] = useState('');
  const [yardSlots, setYardSlots] = useState('');
  const [yardAddress, setYardAddress] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({
    yardName: '',
    yardSlots: '',
    yardAddress: '',
  });

  // Chip stats state
  const [chipStats, setChipStats] = useState({
    activeChips: 0,
    inactiveChips: 0,
    lowBatteryChips: 0,
  });

  // User state
  const [user, setUser] = useState(null);

  // MQTT and Battery states
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);

  // Static chip ID for battery testing
  const STATIC_CHIP_ID = "2CF7F1C07190019F";

  // MQTT Configuration
  const MQTT_CONFIG = {
    host: "ws://sensecap-openstream.seeed.cc:8083/mqtt",
    username: "org-449810146246400",
    password: "9B1C6913197A4C56B5EC31F1CEBAECF9E7C7235B015B456DB0EC577BD7C167F3",
    clientId: "org-449810146246400-react-" + Math.random().toString(16).substr(2, 8),
    protocolVersion: 4,
  };

  // Initialize MQTT for battery monitoring
  const initializeMqtt = async () => {
    const client = mqtt.connect(MQTT_CONFIG.host, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      clientId: MQTT_CONFIG.clientId,
      protocolVersion: MQTT_CONFIG.protocolVersion,
    });

    client.on("connect", async () => {
      console.log("✅ HomeScreen: Connected to MQTT for battery monitoring");
      setMqttConnected(true);

      // Get all active chips and subscribe to their battery topics
      const activeChips = await getActiveChips();
      console.log(`🔋 Found ${activeChips.length} active chips for battery monitoring`);

      // Subscribe to battery topic for each active chip
      for (const chip of activeChips) {
        const batteryTopic = `/device_sensor_data/449810146246400/${chip.chipId}/+/vs/3000`;
        console.log(`🔋 Subscribing to battery topic for chip ${chip.chipId}`);

        client.subscribe(batteryTopic, (err) => {
          if (err) {
            console.error(`❌ Failed to subscribe to battery topic for ${chip.chipId}:`, err);
          } else {
            console.log(`✅ Subscribed to battery topic for chip: ${chip.chipId}`);
          }
        });
      }

      // Also subscribe to static chip for testing
      const batteryTopic = `/device_sensor_data/449810146246400/${STATIC_CHIP_ID}/+/vs/3000`;
      client.subscribe(batteryTopic, (err) => {
        if (err) {
          console.error("❌ Failed to subscribe to static battery topic:", err);
        } else {
          console.log(`✅ Subscribed to static battery topic: ${batteryTopic}`);
        }
      });
    });

    client.on("message", async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        console.log('🔋 HomeScreen: Battery data received');
        console.log('🔋 Topic:', topic);
        console.log('🔋 Battery Value:', payload.value);

        // Only process topic 3000 (battery data)
        if (topic.includes('/vs/3000')) {
          const batteryValue = payload.value;

          // Extract chip ID from topic
          // Topic format: /device_sensor_data/449810146246400/2CF7F1C07190019F/0/vs/3000
          // Split: ['', 'device_sensor_data', '449810146246400', '2CF7F1C07190019F', '0', 'vs', '3000']
          const topicParts = topic.split('/');
          const chipId = topicParts[3]; // chip ID is at index 3

          console.log(`🔋 ✅ Battery level received for chip ${chipId}: ${batteryValue}%`);

          // Update battery level in chip manager
          const updated = await updateChipBatteryLevel(chipId, batteryValue);

          if (updated) {
            console.log(`🔋 ✅ Battery level updated in chip manager: ${chipId} = ${batteryValue}%`);
            // Reload chip stats to update low battery count
            loadChipStats();
          }

          // Update local battery level for UI (for static chip)
          if (chipId === STATIC_CHIP_ID) {
            setBatteryLevel(batteryValue);
          }
        }
      } catch (error) {
        console.error('🔋 ❌ Error parsing MQTT message:', error);
      }
    });

    client.on("error", (error) => {
      console.error("HomeScreen MQTT Error:", error);
      setMqttConnected(false);
    });

    setMqttClient(client);
  };

  // Show battery alert
  const showBatteryAlert = (batteryLevel) => {
    let message = '';
    let title = 'Battery Status';

    if (batteryLevel > 50) {
      message = `🔋 Battery Level: ${batteryLevel}% - Good`;
      title = 'Good Battery';
    } else if (batteryLevel > 20) {
      message = `🔋 Battery Level: ${batteryLevel}% - Low`;
      title = 'Low Battery';
    } else {
      message = `🔋 Battery Level: ${batteryLevel}% - Critical`;
      title = 'Critical Battery';
    }

    Alert.alert(title, message, [
      { text: 'OK', style: 'default' }
    ]);
  };

  // Load yards, chip stats, and user data from AsyncStorage
  useEffect(() => {
    loadYards();
    loadChipStats();
    loadUserData();

    // Initialize MQTT for battery monitoring
    initializeMqtt();

    // Don't set mock data - wait for real MQTT data
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadChipStats();
      loadUserData();
    }, [])
  );

  // Cleanup MQTT connection
  useEffect(() => {
    return () => {
      if (mqttClient) {
        console.log('Disconnecting MQTT client from HomeScreen...');
        mqttClient.end();
        setMqttClient(null);
        setMqttConnected(false);
      }
    };
  }, [mqttClient]);

  const loadYards = async () => {
    try {
      console.log('🔄 Loading yards from Supabase (real-time)...');
      
      // Fetch from Supabase - Primary source
      const { data: supabaseYards, error } = await supabase
        .from('facility')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('❌ Supabase fetch error:', error);
        // Fallback to local storage backup if Supabase fails (network issue)
        const savedYards = await AsyncStorage.getItem('parking_yards');
        if (savedYards) {
          console.log('⚠️ Using local backup data (Supabase unavailable)');
          setYards(JSON.parse(savedYards));
        } else {
          setYards([]); // Show empty state
        }
        return;
      }

      console.log('✅ Fetched from Supabase:', supabaseYards.length, 'yards');

      // Map Supabase data to app format
      const mappedYards = supabaseYards.map(yard => ({
        id: yard.id.toString(),
        name: yard.name || 'Unnamed Yard',
        address: yard.address ? `${yard.address}${yard.city ? ', ' + yard.city : ''}` : 'No Address',
        slots: yard.parkingSlots ? parseInt(yard.parkingSlots) : 50,
        source: 'supabase',
        createdAt: yard.created_at || new Date().toISOString(),
      }));

      // Use ONLY Supabase data (real-time)
      setYards(mappedYards);

      // Save to local storage as backup only
      await AsyncStorage.setItem('parking_yards', JSON.stringify(mappedYards));

      console.log('📊 Real-time yards from Supabase:', mappedYards.length);
      if (mappedYards.length === 0) {
        console.log('📭 No yards found - Show Add Yard option');
      }

    } catch (error) {
      console.error('❌ Error loading yards:', error);
      // Fallback to local storage backup
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        console.log('⚠️ Using local backup data (Error occurred)');
        setYards(JSON.parse(savedYards));
      } else {
        setYards([]); // Show empty state
      }
    }
  };

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Load chip stats from AsyncStorage using chip manager
  const loadChipStats = async () => {
    try {
      // Get chip counts from chip manager
      const { activeCount, inactiveCount } = await getChipCounts();

      // Get critical battery chips (0-20%) for count
      const criticalChips = await getCriticalBatteryChips();
      const lowBatteryChips = criticalChips.length;

      setChipStats({
        activeChips: activeCount,
        inactiveChips: inactiveCount,
        lowBatteryChips,
      });

      console.log('Chip stats loaded from chip manager:', {
        activeChips: activeCount,
        inactiveChips: inactiveCount,
        lowBatteryChips: lowBatteryChips,
        criticalChipsDetails: criticalChips.map(c => `${c.chipId}: ${c.batteryLevel}%`)
      });
    } catch (error) {
      console.error('Error loading chip stats:', error);
    }
  };

  // Save yards to AsyncStorage
  const saveYards = async (newYards) => {
    try {
      await AsyncStorage.setItem('parking_yards', JSON.stringify(newYards));
    } catch (error) {
      console.error('Error saving yards:', error);
    }
  };

  // Clear specific error
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Clear form data
  const clearFormData = () => {
    setYardName('');
    setYardSlots('');
    setYardAddress('');
    setErrors({ yardName: '', yardSlots: '', yardAddress: '' });
  };

  // Validate form
  const validateForm = () => {
    let newErrors = {
      yardName: '',
      yardSlots: '',
      yardAddress: '',
    };
    let isValid = true;

    if (!yardName.trim()) {
      newErrors.yardName = 'Please enter yard name';
      isValid = false;
    }

    if (!yardSlots.trim()) {
      newErrors.yardSlots = 'Please enter number of slots';
      isValid = false;
    } else if (isNaN(yardSlots) || parseInt(yardSlots) <= 0) {
      newErrors.yardSlots = 'Please enter valid number of slots';
      isValid = false;
    }

    if (!yardAddress.trim()) {
      newErrors.yardAddress = 'Please enter yard address';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Add new yard
  const handleAddYard = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      console.log('🔄 Adding yard to Supabase...');

      // Generate unique ID
      const newId = Date.now();

      // Prepare data for Supabase
      const supabaseYard = {
        id: newId,
        name: yardName,
        address: yardAddress,
        parkingSlots: parseInt(yardSlots), // Store slots in 'parkingSlots' field (camelCase)
        city: '', // Can be empty for now
        lat: '',
        long: '',
      };

      // 1. Insert to Supabase first
      const { data, error } = await supabase
        .from('facility')
        .insert([supabaseYard])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        Alert.alert('Error', `Failed to add yard to database: ${error.message}`);
        return;
      }

      console.log('✅ Added to Supabase:', data);

      // 2. Prepare data for local storage
      const newYard = {
        id: newId.toString(),
        name: yardName,
        address: yardAddress,
        slots: parseInt(yardSlots),
        source: 'supabase',
        createdAt: new Date().toISOString(),
      };

      // 3. Update local storage
      const updatedYards = [...yards, newYard];
      setYards(updatedYards);
      await saveYards(updatedYards);

      console.log('✅ Added to local storage');

      // Reset form and close modal
      clearFormData();
      setShowAddYardModal(false);

      Toast.show('✅ Yard added successfully!', Toast.LONG);

    } catch (error) {
      console.error('❌ Error adding yard:', error);
      Alert.alert('Error', `Failed to add yard: ${error.message}`);
    }
  };

  // Open edit yard modal
  const handleOpenEditYard = (yard) => {
    setEditingYard(yard);
    setYardName(yard.name);
    setYardAddress(yard.address);
    setYardSlots(yard.slots.toString());
    setShowAddYardModal(true); // Same modal reuse
  };

  // Update yard
  const handleUpdateYard = async () => {
    if (!validateForm()) {
      return;
    }

    const newSlots = parseInt(yardSlots);

    // Check if reducing slots below current vehicle count
    const storageKey = `yard_${editingYard.id}_vehicles`;
    const savedVehicles = await AsyncStorage.getItem(storageKey);
    const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;

    if (newSlots < vehicleCount) {
      Alert.alert(
        'Cannot Reduce Slots',
        `This yard has ${vehicleCount} vehicles. You cannot reduce slots below ${vehicleCount}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('🔄 Updating yard in Supabase...');

      // 1. Update in Supabase first
      const { data, error } = await supabase
        .from('facility')
        .update({
          name: yardName,
          address: yardAddress,
          parkingSlots: newSlots,
        })
        .eq('id', editingYard.id)
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        Alert.alert('Error', `Failed to update yard: ${error.message}`);
        return;
      }

      console.log('✅ Updated in Supabase:', data);

      // 2. Update local storage
      const updatedYards = yards.map(y =>
        y.id === editingYard.id
          ? { ...y, name: yardName, address: yardAddress, slots: newSlots, updatedAt: new Date().toISOString() }
          : y
      );

      setYards(updatedYards);
      await saveYards(updatedYards);

      console.log('✅ Updated in local storage');

      // Reset form and close modal
      clearFormData();
      setEditingYard(null);
      setShowAddYardModal(false); // Same modal

      Toast.show('✅ Yard updated successfully!', Toast.LONG);

    } catch (error) {
      console.error('❌ Error updating yard:', error);
      Alert.alert('Error', `Failed to update yard: ${error.message}`);
    }
  };

  // Delete yard
  const handleDeleteYard = async (yard) => {
    // Check if yard has vehicles
    const storageKey = `yard_${yard.id}_vehicles`;
    const savedVehicles = await AsyncStorage.getItem(storageKey);
    const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;

    if (vehicleCount > 0) {
      Alert.alert(
        'Cannot Delete Yard',
        `This yard has ${vehicleCount} vehicles. Please remove all vehicles first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Yard',
      `Are you sure you want to delete "${yard.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting yard from Supabase...');

              // 1. Delete from Supabase first
              const { error } = await supabase
                .from('facility')
                .delete()
                .eq('id', yard.id);

              if (error) {
                console.error('❌ Supabase delete error:', error);
                Alert.alert('Error', `Failed to delete yard: ${error.message}`);
                return;
              }

              console.log('✅ Deleted from Supabase');

              // 2. Update local storage
              const updatedYards = yards.filter(y => y.id !== yard.id);
              setYards(updatedYards);
              await saveYards(updatedYards);

              // Remove yard vehicles storage key
              await AsyncStorage.removeItem(storageKey);

              console.log('✅ Deleted from local storage');

              Toast.show('✅ Yard deleted successfully!', Toast.LONG);

            } catch (error) {
              console.error('❌ Error deleting yard:', error);
              Alert.alert('Error', `Failed to delete yard: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Helper function to get slot information for a yard
  const getSlotInfo = async (yardId) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storageKey = `yard_${yardId}_vehicles`;
      const savedVehicles = await AsyncStorage.getItem(storageKey);
      const vehicleCount = savedVehicles ? JSON.parse(savedVehicles).length : 0;

      // First check in yards state (dynamic yards), then static parkingYards
      let yard = yards.find(y => y.id === yardId);
      if (!yard) {
        yard = parkingYards.find(y => y.id === yardId);
      }

      const totalSlots = parseInt(yard?.slots) || 50; // Default to 50 if not specified
      const availableSlots = Math.max(0, totalSlots - vehicleCount);

      return {
        total: totalSlots,
        occupied: vehicleCount,
        available: availableSlots
      };
    } catch (error) {
      console.error('Error calculating slot info:', error);
      return { total: 50, occupied: 0, available: 50 };
    }
  };

  // Yard Card Component with dynamic slot info
  const YardCard = ({ item, isSelected, onPress }) => {
    const [slotInfo, setSlotInfo] = useState({ total: item?.slots || 50, occupied: 0, available: item?.slots || 50 });

    useEffect(() => {
      const loadSlotInfo = async () => {
        const info = await getSlotInfo(item.id);
        setSlotInfo(info);
      };
      loadSlotInfo();
    }, [item.id]);

    const displayName = item?.name?.charAt(0).toUpperCase() + item?.name?.slice(1);

    return (
      <TouchableOpacity
        style={[styles.simpleYardCard, isSelected && styles.selectedSimpleCard]}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.yardCardHeader}>
          <View style={styles.simpleCardLeft}>
            <View style={styles.simpleIconContainer}>
              <Ionicons name="business" size={24} color="#613EEA" />
            </View>
            <View style={styles.simpleTextContainer}>
              <Text style={[styles.simpleYardName, isSelected && styles.selectedText]}>
                {displayName}
              </Text>
              <Text style={[styles.simpleYardAddress, isSelected && styles.selectedText]}>
                {item?.address}
              </Text>
              {slotInfo.available === 0 ? (
                <View style={styles.fullYardContainer}>
                  <Ionicons name="warning" size={16} color="#FF6B6B" />
                  <Text style={styles.fullYardText}>
                    Yard is full! ({slotInfo.total}/{slotInfo.total} slots)
                  </Text>
                </View>
              ) : (
                <Text style={styles.simpleSlotText}>
                  {slotInfo.available} available • {slotInfo.total} total slots
                </Text>
              )}
            </View>
          </View>

          {/* Edit & Delete Buttons - Top Right */}
          <View style={styles.yardCardActions}>
            <TouchableOpacity
              style={styles.editYardButton}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenEditYard(item);
              }}>
              <Ionicons name="pencil" size={18} color="#613EEA" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteYardButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteYard(item);
              }}>
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = item?.id === selectedYard;

    return (
      <YardCard
        item={item}
        isSelected={isSelected}
        onPress={() => {
          setSelectedYard(item?.id);
          navigation.navigate('YardDetailScreen', {
            yardId: item?.id,
            yardName: item?.name,
            fromScreen: 'HomeScreen'
          });
        }}
      />
    );
  };
  const handlePress = item => {
    setDrawerOpen(true);

    // Hide tab bar when modal opens
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
  };

  const closeModal = () => {
    setDrawerOpen(false);

    // Show tab bar again
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
  };
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
    }, []),
  );

  const handleOpenAR = () => {
    // Send static coordinates instead of yard center
    // Static location 500m away in Mohali
    const target = { latitude: 30.713452, longitude: 76.691131 };
    navigation.navigate('ARNavigationScreen', { target });
  };

  const capitalizedName = user?.name
    ? user?.name?.split(' ').map(word =>
      word?.charAt(0).toUpperCase() + word?.slice(1).toLowerCase()
    ).join(' ')
    : 'User';

  return (
    <View style={[styles.container, { marginBottom: 0 }]}>
      {/* Beautiful Gradient Header */}
      <View style={styles.beautifulHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handlePress} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.userName}>{capitalizedName || 'Parking Manager'}</Text>
          </View>

          <View style={styles.headerIcons}>
            {/* <TouchableOpacity onPress={handleOpenAR} style={styles.iconBtn}>
              <Ionicons name="navigate" size={24} color="#fff" />
            </TouchableOpacity> */}
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationScreen')}
              style={styles.iconBtn}>
              <Ionicons name="notifications" size={24} color="#fff" />

            </TouchableOpacity>
          </View>
        </View>

        {!isDrawerOpen && (
          <TouchableOpacity
            style={styles.beautifulSearchBar}
            onPress={() => navigation.navigate('SearchScreen')}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#613EEA" />
            </View>
            <Text style={styles.searchText}>
              Search VIN, Make, Model...
            </Text>
            <View style={styles.searchArrow}>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="none"         // Drawer apni reanimated se slide hoga
        onRequestClose={() => setDrawerOpen(false)}
      >

        <DrawerMenu
          isOpen={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={user}
          navigation={navigation}
          setCheckUser={setCheckUser}
        />
      </Modal>
      {/* Beautiful Stats Cards */}
      <View style={styles.beautifulCardsContainer}>
        {getCardData(chipStats)?.map(item => (
          <TouchableOpacity
            key={item?.id}
            style={styles.beautifulCard}
            onPress={() =>
              navigation.navigate('ActiveChipScreen', { type: item.type })
            }>
            <View style={[styles.cardBackground, { backgroundColor: item.backgroundColor }]}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Text style={styles.beautifulCardText}>{item.text}</Text>
                  <Text style={styles.beautifulCardCount}>{item.count}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Image
                    source={item?.icon}
                    style={styles.beautifulCardIcon}
                  />
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.footerLine} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1, marginBottom: 100 }}>
        <View style={{ flex: 1, paddingTop: 30, paddingHorizontal: 20 }}>
          <View style={styles.beautifulYardsHeader}>
            <View style={styles.yardsTitleSection}>
              <Text style={styles.beautifulTitle}>Parking Yards</Text>
              <Text style={styles.yardsSubtitle}>Manage your facilities</Text>
            </View>
            <TouchableOpacity
              style={styles.beautifulAddButton}
              onPress={() => setShowAddYardModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Dynamic Yards */}
          {yards.length > 0 ? (
            <FlatList
              data={yards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.beautifulEmptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="business-outline" size={30} color="#613EEA" />
              </View>
              <Text style={styles.beautifulEmptyText}>No Parking Yards Yet</Text>
              <Text style={styles.beautifulEmptySubtext}>
                Get started by adding your first parking facility
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => setShowAddYardModal(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyActionText}>Add First Yard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Static Yards - Commented for future use */}
          {/* <FlatList
              data={parkingYards}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            /> */}
        </View>
      </View>

      {/* Add Yard Modal */}
      <Modal
        visible={showAddYardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          clearFormData();
          setShowAddYardModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => { }}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {editingYard ? 'Edit Parking Yard' : 'Add New Parking Yard'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      clearFormData();
                      setEditingYard(null);
                      setShowAddYardModal(false);
                    }}>
                      <Ionicons name="close" size={28} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Yard Name *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardName && styles.inputError]}
                        placeholder="e.g., North Parking Yard"
                        value={yardName}
                        onChangeText={(text) => {
                          setYardName(text);
                          clearError('yardName');
                        }}
                        returnKeyType="next"
                      />
                      {errors.yardName ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardName}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Address *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardAddress && styles.inputError]}
                        placeholder="e.g., 123 Main Street, City"
                        value={yardAddress}
                        onChangeText={(text) => {
                          setYardAddress(text);
                          clearError('yardAddress');
                        }}
                        multiline
                        numberOfLines={2}
                        returnKeyType="next"
                      />
                      {errors.yardAddress ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardAddress}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Number of Parking Slots *</Text>
                      <TextInput
                        style={[styles.textInput, errors.yardSlots && styles.inputError]}
                        placeholder="e.g., 50"
                        value={yardSlots}
                        onChangeText={(text) => {
                          setYardSlots(text);
                          clearError('yardSlots');
                        }}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      {errors.yardSlots ? (
                        <View style={styles.errorContainer}>
                          <Ionicons name="alert-circle" size={16} color={redColor} />
                          <Text style={styles.errorText}>{errors.yardSlots}</Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        editingYard ? handleUpdateYard() : handleAddYard();
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {editingYard ? 'Update Yard' : 'Add Yard'}
                      </Text>
                    </TouchableOpacity>

                    {/* Extra space for keyboard */}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: whiteColor },

  // Beautiful Header Styles
  beautifulHeader: {
    backgroundColor: '#613EEA',
    paddingTop: heightPercentageToDP(6),
    paddingBottom: spacings.Large1x,
    paddingHorizontal: spacings.xxxxLarge,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacings.Large1x,
  },
  menuBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  welcomeSection: {
    flex: 1,
    marginLeft: 15,
  },
  welcomeText: {
    color: whiteColor,
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: '500',
    opacity: 0.9,
  },
  userName: {
    color: whiteColor,
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: 'bold',
    marginTop: spacings.xsmall,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: spacings.large,
    padding: spacings.large,
    marginLeft: spacings.large,
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: spacings.xsmall },
    shadowOpacity: 0.1,
    shadowRadius: spacings.normal,
    elevation: 4,
  },
  notifIcon: {
    height: spacings.medium,
    width: spacings.medium,
    tintColor: whiteColor,
  },
  beautifulSearchBar: {
    backgroundColor: whiteColor,
    borderRadius: spacings.large,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.large,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  searchIconContainer: {
    borderRadius: spacings.fontSizeSmall2x,
    padding: spacings.small2x,
    marginRight: spacings.fontSizeSmall2x,
  },
  searchText: {
    flex: 1,
    fontSize: style.fontSizeNormal.fontSize,
    color: darkgrayColor,
    fontWeight: '500',
  },
  searchArrow: {
    marginLeft: spacings.large,
  },

  // Legacy header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: heightPercentageToDP(5),
    width: widthPercentageToDP(64),
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  drawer: {
    position: 'absolute',
    right: -100,
    top: 100,
  },
  headerTitle: { fontWeight: 'bold', fontSize: 16 },
  topContainer: { backgroundColor: 'white' },
  mapPlaceholder: { position: 'relative', alignItems: 'flex-end' },
  mapImage: {
    width: '80%',
    height: 160,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 20,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'purple',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
  },
  detailsContainer: { marginTop: 40 },
  locationText: { fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingLeft: 16,
  },
  profileImage: { width: 60, height: 60, borderRadius: 30 },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'green',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  role: { color: 'gray' },
  badge: { color: 'gray' },
  // Beautiful Cards Styles
  beautifulCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  beautifulCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBackground: {
    padding: 16,
    minHeight: 110,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'center',
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerLine: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  beautifulCardText: {
    color: whiteColor,
    fontSize: style.fontSizeSmall1x.fontSize,
    fontWeight: '600',
    marginBottom: spacings.small2x,
    opacity: 0.95,
  },
  beautifulCardCount: {
    color: whiteColor,
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  beautifulCardIcon: {
    height: hp(4.2),
    width: hp(4.2),
    resizeMode: 'contain',
  },

  // Beautiful Yards Section
  beautifulYardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  yardsTitleSection: {
    flex: 1,
  },
  beautifulTitle: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: 'bold',
    color: darkgrayColor,
    marginBottom: spacings.xsmall,
  },
  yardsSubtitle: {
    fontSize: style.fontSizeNormal.fontSize,
    color: grayColor,
    fontWeight: '500',
  },
  beautifulAddButton: {
    backgroundColor: '#613EEA',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  // Simple Yard Cards (Clean Design)
  simpleYardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedSimpleCard: {
    borderColor: '#613EEA',
    borderWidth: 2,
    backgroundColor: '#faf9ff',
  },
  yardCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  simpleCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  simpleIconContainer: {
    backgroundColor: '#f3f0ff',
    borderRadius: 8,
    padding: 6,
    marginRight: 10,
  },
  simpleTextContainer: {
    flex: 1,
  },
  simpleYardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  simpleYardAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
    lineHeight: 16,
  },
  slotInfoContainer: {
    marginTop: 2,
  },
  simpleSlotText: {
    fontSize: 11,
    color: '#613EEA',
    fontWeight: '600',
  },
  fullYardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fullYardText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  totalSlotText: {
    fontSize: 10,
    color: '#999',
  },
  yardCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editYardButton: {
    backgroundColor: '#f3f0ff',
    padding: 8,
    borderRadius: 8,
  },
  deleteYardButton: {
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 8,
  },
  selectedText: {
    color: '#613EEA',
  },
  // Beautiful Empty State
  beautifulEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 25,
  },
  emptyIconWrapper: {
    backgroundColor: '#f3f0ff',
    borderRadius: 40,
    padding: 10,
    marginBottom: 16,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  beautifulEmptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  beautifulEmptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: '#613EEA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  submitButton: {
    backgroundColor: '#613EEA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Error Styles
  inputError: {
    borderColor: redColor,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    color: redColor,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },

  // Battery Status Styles
  batteryStatusContainer: {
    paddingHorizontal: spacings.xxxxLarge,
    paddingVertical: spacings.small,
  },
  batteryStatusCard: {
    backgroundColor: '#F8F9FA',
    padding: spacings.medium,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batteryTextContainer: {
    marginLeft: spacings.small,
    flex: 1,
  },
  batteryStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 4,
  },
  batteryStatusSubText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 2,
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    marginTop: spacings.small,
  },
  testBatteryBtn: {
    backgroundColor: '#613EEA',
    paddingHorizontal: spacings.medium,
    paddingVertical: spacings.small,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  testBatteryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusInfoContainer: {
    marginTop: spacings.small,
    padding: spacings.small,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#613EEA',
  },
  statusInfoText: {
    fontSize: 12,
    color: '#613EEA',
    fontWeight: '500',
    textAlign: 'center',
  },
});

// search globally ,
// facility list screen  changes add search functionality on facility screen ,
// Home screen changes,
// vin details screen changes ,
// make new screens active chips, in-active chips , and low battery chips  and add   logos and header changes
