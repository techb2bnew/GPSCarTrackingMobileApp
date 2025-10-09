import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Chip Manager Utility
 * Manages active and inactive chip arrays in local storage
 */

const ACTIVE_CHIPS_KEY = 'active_chips';
const INACTIVE_CHIPS_KEY = 'inactive_chips';

/**
 * Get all active chips
 * @returns {Promise<Array>} Array of active chip objects
 */
export const getActiveChips = async () => {
  try {
    const chips = await AsyncStorage.getItem(ACTIVE_CHIPS_KEY);
    return chips ? JSON.parse(chips) : [];
  } catch (error) {
    console.error('Error getting active chips:', error);
    return [];
  }
};

/**
 * Get all inactive chips
 * @returns {Promise<Array>} Array of inactive chip objects
 */
export const getInactiveChips = async () => {
  try {
    const chips = await AsyncStorage.getItem(INACTIVE_CHIPS_KEY);
    return chips ? JSON.parse(chips) : [];
  } catch (error) {
    console.error('Error getting inactive chips:', error);
    return [];
  }
};

/**
 * Add chip to active chips array
 * @param {Object} chipData - { chipId, vehicleId, vin, make, model, year, yardId, yardName, assignedAt }
 * @returns {Promise<boolean>} Success status
 */
export const addActiveChip = async (chipData) => {
  try {
    const activeChips = await getActiveChips();
    
    // Check if chip already exists in active array
    const existingIndex = activeChips.findIndex(c => c.chipId === chipData.chipId);
    
    if (existingIndex >= 0) {
      // Update existing chip data
      activeChips[existingIndex] = {
        ...activeChips[existingIndex],
        ...chipData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new chip
      activeChips.push({
        ...chipData,
        assignedAt: new Date().toISOString()
      });
    }
    
    await AsyncStorage.setItem(ACTIVE_CHIPS_KEY, JSON.stringify(activeChips));
    console.log('✅ Added chip to active chips:', chipData.chipId);
    return true;
  } catch (error) {
    console.error('Error adding active chip:', error);
    return false;
  }
};

/**
 * Add chip to inactive chips array
 * @param {Object} chipData - { chipId, lastVehicleId, lastVin, lastMake, lastModel, lastYear, lastYardId, lastYardName, unassignedAt }
 * @returns {Promise<boolean>} Success status
 */
export const addInactiveChip = async (chipData) => {
  try {
    const inactiveChips = await getInactiveChips();
    
    // Check if chip already exists in inactive array
    const existingIndex = inactiveChips.findIndex(c => c.chipId === chipData.chipId);
    
    if (existingIndex >= 0) {
      // Update existing chip data
      inactiveChips[existingIndex] = {
        ...inactiveChips[existingIndex],
        ...chipData,
        unassignedAt: new Date().toISOString()
      };
    } else {
      // Add new chip
      inactiveChips.push({
        ...chipData,
        unassignedAt: new Date().toISOString()
      });
    }
    
    await AsyncStorage.setItem(INACTIVE_CHIPS_KEY, JSON.stringify(inactiveChips));
    console.log('✅ Added chip to inactive chips:', chipData.chipId);
    return true;
  } catch (error) {
    console.error('Error adding inactive chip:', error);
    return false;
  }
};

/**
 * Remove chip from active chips array
 * @param {string} chipId - Chip ID to remove
 * @returns {Promise<Object|null>} Removed chip data or null
 */
export const removeActiveChip = async (chipId) => {
  try {
    const activeChips = await getActiveChips();
    const chipIndex = activeChips.findIndex(c => c.chipId === chipId);
    
    if (chipIndex >= 0) {
      const [removedChip] = activeChips.splice(chipIndex, 1);
      await AsyncStorage.setItem(ACTIVE_CHIPS_KEY, JSON.stringify(activeChips));
      console.log('✅ Removed chip from active chips:', chipId);
      return removedChip;
    }
    
    return null;
  } catch (error) {
    console.error('Error removing active chip:', error);
    return null;
  }
};

/**
 * Remove chip from inactive chips array
 * @param {string} chipId - Chip ID to remove
 * @returns {Promise<Object|null>} Removed chip data or null
 */
export const removeInactiveChip = async (chipId) => {
  try {
    const inactiveChips = await getInactiveChips();
    const chipIndex = inactiveChips.findIndex(c => c.chipId === chipId);
    
    if (chipIndex >= 0) {
      const [removedChip] = inactiveChips.splice(chipIndex, 1);
      await AsyncStorage.setItem(INACTIVE_CHIPS_KEY, JSON.stringify(inactiveChips));
      console.log('✅ Removed chip from inactive chips:', chipId);
      return removedChip;
    }
    
    return null;
  } catch (error) {
    console.error('Error removing inactive chip:', error);
    return null;
  }
};

/**
 * Move chip from active to inactive
 * @param {string} chipId - Chip ID to move
 * @param {Object} additionalData - Additional data to include with inactive chip
 * @returns {Promise<boolean>} Success status
 */
export const moveChipToInactive = async (chipId, additionalData = {}) => {
  try {
    const removedChip = await removeActiveChip(chipId);
    
    if (removedChip) {
      await addInactiveChip({
        chipId: removedChip.chipId,
        lastVehicleId: removedChip.vehicleId,
        lastVin: removedChip.vin,
        lastMake: removedChip.make,
        lastModel: removedChip.model,
        lastYear: removedChip.year,
        lastYardId: removedChip.yardId,
        lastYardName: removedChip.yardName,
        ...additionalData
      });
      console.log('✅ Moved chip from active to inactive:', chipId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error moving chip to inactive:', error);
    return false;
  }
};

/**
 * Move chip from inactive to active
 * @param {string} chipId - Chip ID to move
 * @param {Object} vehicleData - New vehicle data for active chip
 * @returns {Promise<boolean>} Success status
 */
export const moveChipToActive = async (chipId, vehicleData) => {
  try {
    const removedChip = await removeInactiveChip(chipId);
    
    if (removedChip || vehicleData) {
      await addActiveChip({
        chipId: chipId,
        vehicleId: vehicleData.vehicleId,
        vin: vehicleData.vin,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        yardId: vehicleData.yardId,
        yardName: vehicleData.yardName
      });
      console.log('✅ Moved chip from inactive to active:', chipId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error moving chip to active:', error);
    return false;
  }
};

/**
 * Find chip in active or inactive arrays
 * @param {string} chipId - Chip ID to find
 * @returns {Promise<Object>} { found: boolean, location: 'active'|'inactive'|null, chip: Object|null }
 */
export const findChip = async (chipId) => {
  try {
    const activeChips = await getActiveChips();
    const activeChip = activeChips.find(c => c.chipId === chipId);
    
    if (activeChip) {
      return { found: true, location: 'active', chip: activeChip };
    }
    
    const inactiveChips = await getInactiveChips();
    const inactiveChip = inactiveChips.find(c => c.chipId === chipId);
    
    if (inactiveChip) {
      return { found: true, location: 'inactive', chip: inactiveChip };
    }
    
    return { found: false, location: null, chip: null };
  } catch (error) {
    console.error('Error finding chip:', error);
    return { found: false, location: null, chip: null };
  }
};

/**
 * Get chip counts
 * @returns {Promise<Object>} { activeCount: number, inactiveCount: number }
 */
export const getChipCounts = async () => {
  try {
    const activeChips = await getActiveChips();
    const inactiveChips = await getInactiveChips();
    
    return {
      activeCount: activeChips.length,
      inactiveCount: inactiveChips.length
    };
  } catch (error) {
    console.error('Error getting chip counts:', error);
    return { activeCount: 0, inactiveCount: 0 };
  }
};

/**
 * Update battery level for a chip
 * @param {string} chipId - Chip ID
 * @param {number} batteryLevel - Battery level (0-100)
 * @returns {Promise<boolean>} Success status
 */
export const updateChipBatteryLevel = async (chipId, batteryLevel) => {
  try {
    const activeChips = await getActiveChips();
    const chipIndex = activeChips.findIndex(c => c.chipId === chipId);
    
    if (chipIndex >= 0) {
      activeChips[chipIndex].batteryLevel = batteryLevel;
      activeChips[chipIndex].lastBatteryUpdate = new Date().toISOString();
      
      await AsyncStorage.setItem(ACTIVE_CHIPS_KEY, JSON.stringify(activeChips));
      console.log(`✅ Updated battery level for chip ${chipId}: ${batteryLevel}%`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating chip battery level:', error);
    return false;
  }
};

/**
 * Get critical battery chips (0-20%)
 * @returns {Promise<Array>} Array of chips with critical battery
 */
export const getCriticalBatteryChips = async () => {
  try {
    const activeChips = await getActiveChips();
    // Filter chips with battery level between 0-20%
    const criticalChips = activeChips.filter(chip => {
      return chip.batteryLevel !== null && chip.batteryLevel !== undefined && chip.batteryLevel <= 20;
    });
    
    console.log(`Found ${criticalChips.length} chips with critical battery`);
    return criticalChips;
  } catch (error) {
    console.error('Error getting critical battery chips:', error);
    return [];
  }
};

/**
 * Get battery status for a chip
 * @param {number} batteryLevel - Battery level (0-100)
 * @returns {Object} { status: 'critical'|'medium'|'good', color: string }
 */
export const getBatteryStatus = (batteryLevel) => {
  if (batteryLevel === null || batteryLevel === undefined) {
    return { status: 'unknown', color: '#999', label: 'Unknown' };
  }
  
  if (batteryLevel <= 20) {
    return { status: 'critical', color: '#F24369', label: 'Critical' };
  } else if (batteryLevel <= 60) {
    return { status: 'medium', color: '#F2893D', label: 'Medium' };
  } else {
    return { status: 'good', color: '#45C64F', label: 'Good' };
  }
};

/**
 * Clear all chips (for testing/debugging)
 * @returns {Promise<boolean>} Success status
 */
export const clearAllChips = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_CHIPS_KEY);
    await AsyncStorage.removeItem(INACTIVE_CHIPS_KEY);
    console.log('✅ Cleared all chips');
    return true;
  } catch (error) {
    console.error('Error clearing chips:', error);
    return false;
  }
};


/**
 * Get time ago from timestamp
 * @param {string} timestamp - ISO timestamp  
 * @returns {string} Human readable time ago
 */
export const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
};

