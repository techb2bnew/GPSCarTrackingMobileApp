import { CHIP_STATUS_API_URL, CHIP_STATUS_API_AUTH } from '../constants/Constants';

// SenseCAP API expects only device EUIs (16 hex chars). VINs or other IDs cause 11303.
const isValidDeviceEui = (id) => {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  return /^[0-9A-Fa-f]{16}$/.test(trimmed);
};

/**
 * Check online status for multiple chips using SenseCap API
 * @param {Array<string>} deviceEuis - Array of chip IDs (device EUIs only; VINs filtered out)
 * @returns {Promise<Object>} Map of chipId -> { online_status: 0|1, ... }
 */
export const checkChipOnlineStatus = async (deviceEuis) => {
  try {
    if (!deviceEuis || deviceEuis.length === 0) {
      console.log('⚠️ [CHIP_STATUS_API] No chip IDs provided');
      return {};
    }

    const validEuis = deviceEuis.filter(isValidDeviceEui);
    const skipped = deviceEuis.filter((id) => !isValidDeviceEui(id));
    if (skipped.length > 0) {
      console.log(`⚠️ [CHIP_STATUS] Skipping non-EUI IDs (VIN etc): ${skipped.join(', ')}`);
    }
    if (validEuis.length === 0) {
      console.log('⚠️ [CHIP_STATUS_API] No valid device EUIs (16 hex chars) to check');
      return {};
    }

    const response = await fetch(CHIP_STATUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${CHIP_STATUS_API_AUTH}`,
      },
      body: JSON.stringify({
        device_euis: validEuis,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [CHIP_STATUS_API] API Error: ${response.status} - ${errorText}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Check if API returned error
    if (data.code !== '0' && data.code !== 0) {
      console.error(`❌ [CHIP_STATUS_API] API returned error code: ${data.code}`, data);
      throw new Error(`API error: ${data.code}`);
    }

    // Create a map of chipId -> status
    const statusMap = {};
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((device) => {
        const chipId = device.device_eui;
        statusMap[chipId] = {
          online_status: device.online_status, // 0 = inactive, 1 = active
          battery_status: device.battery_status,
          latest_message_time: device.latest_message_time,
          expired_time: device.expired_time,
        };
      });
    }

    // console.log(`✅ [CHIP_STATUS_API] Successfully checked ${Object.keys(statusMap).length} chips`);
    
    // Log status summary
    const activeCount = Object.values(statusMap).filter(s => s.online_status === 1).length;
    const inactiveCount = Object.values(statusMap).filter(s => s.online_status === 0).length;
    // console.log(`📊 [CHIP_STATUS_API] Active: ${activeCount}, Inactive: ${inactiveCount}`);

    return statusMap;
  } catch (error) {
    console.error('❌ [CHIP_STATUS_API] Error checking chip status:', error);
    // Return empty object on error - let calling code handle it
    return {};
  }
};

/**
 * Batch check chips in chunks (if API has limits)
 * @param {Array<string>} deviceEuis - Array of chip IDs
 * @param {number} batchSize - Number of chips per batch (default: 100)
 * @returns {Promise<Object>} Combined status map
 */
export const checkChipOnlineStatusBatch = async (deviceEuis, batchSize = 100) => {
  try {
    if (!deviceEuis || deviceEuis.length === 0) {
      return {};
    }

    const allStatusMap = {};
    
    // Split into batches
    for (let i = 0; i < deviceEuis.length; i += batchSize) {
      const batch = deviceEuis.slice(i, i + batchSize);
      // console.log(`🔄 [CHIP_STATUS_API] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deviceEuis.length / batchSize)} (${batch.length} chips)`);
      
      const batchStatus = await checkChipOnlineStatus(batch);
      Object.assign(allStatusMap, batchStatus);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < deviceEuis.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allStatusMap;
  } catch (error) {
    console.error('❌ [CHIP_STATUS_API] Error in batch check:', error);
    return {};
  }
};

