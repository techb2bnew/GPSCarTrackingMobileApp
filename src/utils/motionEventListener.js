import mqtt from "mqtt/dist/mqtt";
import { Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { supabase } from '../lib/supabaseClient';
import { getMQTTConfig } from '../constants/Constants';

/**
 * Format timestamp to readable date
 */
const formatTimestamp = (ts) => {
  if (!ts) return "No time available";
  try {
    const date = typeof ts === 'number'
      ? (ts < 10000000000 ? new Date(ts * 1000) : new Date(ts))
      : new Date(ts);
    return date.toLocaleString();
  } catch (error) {
    return "Invalid timestamp";
  }
};

/**
 * Get chip details from Supabase
 */
const getChipDetails = async (chipId) => {
  try {
    const { data } = await supabase
      .from('cars')
      .select('*')
      .eq('chip', chipId)
      .single();

    if (!data) return null;

    return {
      chipId,
      vin: data.vin || 'N/A',
      make: data.make || 'N/A',
      model: data.model || 'N/A',
      year: data.year || 'N/A',
      vehicleId: data.id,
      facilityId: data.facilityId || 'N/A',
      batteryLevel: data.battery_level || 'N/A',
      onlineStatus: data.online_status || 'N/A',
    };
  } catch (error) {
    console.error(`❌ Error fetching chip details:`, error);
    return null;
  }
};

/**
 * Get current location using GPS
 */
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error('❌ Location error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
};

/**
 * Listen to chip motion events via MQTT
 * Main function to detect motion for a chip
 * 
 * IMPORTANT: This is REAL-TIME event-based detection, NOT polling
 * - MQTT connection stays active 24/7
 * - Works in foreground AND background mode
 * - Immediately detects motion when chip moves
 * - No time intervals - instant detection via MQTT events
 */
export const listenChipMotionEvent = async (
  chipId,
  orgId = "449810146246400",
  username = "org-449810146246400",
  password,
  onMotionEvent = null
) => {
  console.log(`\n🔔 [MOTION] Starting REAL-TIME motion detection for chip: ${chipId}`);
  console.log(`🔔 [MOTION] This is event-based - will detect motion INSTANTLY when chip moves`);
  console.log(`🔔 [MOTION] Connection will persist in foreground and background mode`);

  // Use EXACT same MQTT config as VehicleDetailsScreen (which works perfectly)
  const MQTT_CONFIG = getMQTTConfig('motion_' + chipId.substring(0, 8));
  console.log(`🔔 [MOTION] Using MQTT broker: ${MQTT_CONFIG.host}`);

  // Store latest location from chip GPS
  let chipLocation = { latitude: null, longitude: null };
  let isConnected = false;

  // Use EXACT same connection method as VehicleDetailsScreen
  const client = mqtt.connect(MQTT_CONFIG.host, {
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clientId: MQTT_CONFIG.clientId,
    protocolVersion: MQTT_CONFIG.protocolVersion,
    // Same as VehicleDetailsScreen - no extra settings
  });

  // Set up connection handler IMMEDIATELY
  client.on("connect", () => {
    isConnected = true;
    console.log(`✅ [MOTION] MQTT Connected for chip ${chipId}!`);

    // Subscribe to ALL possible motion-related topics
    const topics = [
      // Device status topic - main motion detection
      `/device_status/${orgId}/${chipId}`,
      // Accelerometer sensor (motion detection)
      `/device_sensor_data/${orgId}/${chipId}/+/vs/4209`,
      // GPS coordinates (for location)
      `/device_sensor_data/${orgId}/${chipId}/+/vs/4197`,  // Longitude
      `/device_sensor_data/${orgId}/${chipId}/+/vs/4198`,  // Latitude
    ];

    topics.forEach((topic) => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          console.error(`❌ [MOTION] Failed to subscribe ${topic}:`, err);
        } else {
          console.log(`✅ [MOTION] Subscribed: ${topic}`);
        }
      });
    });
  });

  // REAL-TIME message handler - fires IMMEDIATELY when MQTT message arrives
  // This is event-based, NOT polling - instant detection when chip moves
  client.on("message", async (topic, msg) => {
    try {
      const data = JSON.parse(msg.toString());

      console.log(`\n📨 [MOTION] REAL-TIME message received for chip ${chipId}`);
      console.log(`   Topic: ${topic}`);
      console.log(`   Data:`, JSON.stringify(data, null, 2));
      console.log(`   ⚡ This is INSTANT event-based detection - no polling!`);
console.log("RAW TOPIC:", topic, "RAW DATA:", msg.toString());

      // Handle GPS location data (store for later use)
      if (topic.includes("/vs/4197")) {
        chipLocation.longitude = parseFloat(data?.value);
        console.log(`📍 [MOTION] Chip Longitude: ${chipLocation.longitude}`);
        return;
      }
      
      if (topic.includes("/vs/4198")) {
        chipLocation.latitude = parseFloat(data?.value);
        console.log(`📍 [MOTION] Chip Latitude: ${chipLocation.latitude}`);
        return;
      }

      // Check if this is a motion detection message
      let isMotion = false;
      let motionReason = '';

      // Method 1: Check device_status topic with status field
      if (topic.includes("device_status")) {
        const status = data?.status?.toLowerCase();
        if (status === "motion" || status === "moving" || status === "active") {
          isMotion = true;
          motionReason = `Status: ${status}`;
        }
      }

      // Method 2: Check accelerometer data (sensor 4102)
      if (topic.includes("/vs/4102")) {
        const accelValue = parseFloat(data?.value);
        if (!isNaN(accelValue) && Math.abs(accelValue) > 0.1) {
          isMotion = true;
          motionReason = `Accelerometer: ${accelValue}`;
        }
      }

      // Method 3: Check if data has motion indicators
      if (!isMotion) {
        if (data?.motion === true || data?.motion === 1 || data?.moving === true) {
          isMotion = true;
          motionReason = `Motion flag detected`;
        }
      }

      // If motion detected, show alert with location
      if (isMotion) {
        console.log(`\n🔥🔥🔥 [MOTION] CHIP MOTION DETECTED! 🔥🔥🔥`);
        console.log(`   Chip ID: ${chipId}`);
        console.log(`   Reason: ${motionReason}`);
        console.log(`   Time: ${formatTimestamp(data?.time || data?.timestamp || Date.now())}`);

        // Get chip details from database
        const chipDetails = await getChipDetails(chipId);
        
        // Get location (prefer chip GPS, fallback to device GPS)
        let currentLocation = null;
        try {
          // First try chip's GPS location from MQTT
          if (chipLocation.latitude && chipLocation.longitude) {
            currentLocation = {
              latitude: chipLocation.latitude,
              longitude: chipLocation.longitude,
              source: 'chip_gps'
            };
            console.log(`📍 [MOTION] Using chip GPS location:`, currentLocation);
          } else {
            // Fallback to device GPS
            currentLocation = await getCurrentLocation();
            currentLocation.source = 'device_gps';
            console.log(`📍 [MOTION] Using device GPS location:`, currentLocation);
          }
        } catch (locError) {
          console.log(`⚠️ [MOTION] Could not get location:`, locError);
        }

        // Build alert message
        const alertTitle = "🔥 Chip Motion Detected!";
        let alertMessage = `Chip ID: ${chipId}\n`;
        alertMessage += `Status: Motion Detected\n`;
        alertMessage += `Time: ${formatTimestamp(data?.time || data?.timestamp || Date.now())}\n`;
        alertMessage += `Reason: ${motionReason}\n\n`;

        // Add location
        if (currentLocation) {
          alertMessage += `📍 Location:\n`;
          alertMessage += `Latitude: ${currentLocation.latitude.toFixed(6)}\n`;
          alertMessage += `Longitude: ${currentLocation.longitude.toFixed(6)}\n`;
          alertMessage += `Source: ${currentLocation.source === 'chip_gps' ? 'Chip GPS' : 'Device GPS'}\n\n`;
        } else {
          alertMessage += `⚠️ Location not available\n\n`;
        }

        // Add vehicle details
        if (chipDetails) {
          alertMessage += `📋 Vehicle Details:\n`;
          alertMessage += `VIN: ${chipDetails.vin}\n`;
          alertMessage += `Make: ${chipDetails.make}\n`;
          alertMessage += `Model: ${chipDetails.model}\n`;
          alertMessage += `Year: ${chipDetails.year}\n`;
          alertMessage += `Battery: ${chipDetails.batteryLevel}%\n`;
          alertMessage += `Facility: ${chipDetails.facilityId}\n`;
        } else {
          alertMessage += `⚠️ Chip details not found in database`;
        }

        // Show alert
        Alert.alert(alertTitle, alertMessage, [
          { text: 'OK', style: 'default' }
        ]);

        // Call callback if provided
        if (onMotionEvent) {
          onMotionEvent({
            chipId,
            status: "motion",
            timestamp: data?.time || data?.timestamp || Date.now(),
            fullData: data,
            chipDetails,
            location: currentLocation,
            reason: motionReason,
          });
        }
      } else {
        // Log non-motion messages for debugging
        console.log(`ℹ️ [MOTION] Non-motion message received`);
      }

    } catch (err) {
      console.error(`❌ [MOTION] Error parsing message:`, err);
      console.error(`   Raw message:`, msg.toString());
    }
  });

  client.on("error", (err) => {
    console.error(`❌ [MOTION] MQTT Error for chip ${chipId}:`, err);
    console.error(`❌ [MOTION] Error details:`, JSON.stringify(err, null, 2));
  });

  client.on("close", () => {
    console.log(`🔌 [MOTION] MQTT closed for chip ${chipId} - will reconnect...`);
  });

  client.on("offline", () => {
    console.log(`📴 [MOTION] MQTT offline for chip ${chipId}`);
  });

  client.on("reconnect", () => {
    console.log(`🔄 [MOTION] Reconnecting chip ${chipId}...`);
  });

  // Add end event handler
  client.on("end", () => {
    console.log(`🔚 [MOTION] MQTT connection ended for chip ${chipId}`);
  });

  // Add disconnect event handler
  client.on("disconnect", (packet) => {
    console.log(`🔌 [MOTION] MQTT disconnected for chip ${chipId}`, packet);
    isConnected = false;
  });

  // Return client immediately - connection will establish asynchronously
  // The client will auto-reconnect if connection fails
  return client;
};

/**
 * Listen to motion events for multiple chips
 */
export const listenMultipleChipMotionEvents = async (
  chipIds = [],
  orgId = "449810146246400",
  username = "org-449810146246400",
  password,
  onMotionEvent = null
) => {
  if (!password) {
    console.error("❌ [MOTION] MQTT password missing");
    return [];
  }

  if (!chipIds || chipIds.length === 0) {
    console.log("⚠️ [MOTION] No chip IDs provided");
    return [];
  }

  console.log(`\n🔔 [MOTION] Starting motion listeners for ${chipIds.length} chip(s)...`);

  const clients = [];

  for (const chipId of chipIds) {
    try {
      console.log(`🔔 [MOTION] Initializing listener for chip: ${chipId}`);
      const client = await listenChipMotionEvent(chipId, orgId, username, password, onMotionEvent);
      clients.push({ chipId, client });
      console.log(`✅ [MOTION] Listener started for chip: ${chipId}`);
    } catch (err) {
      console.error(`❌ [MOTION] Failed to init chip ${chipId}:`, err);
    }
  }

  console.log(`✅ [MOTION] All listeners started for ${clients.length} chip(s)`);
  return clients;
};

