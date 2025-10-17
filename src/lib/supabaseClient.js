import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and ANON key from Supabase dashboard
// const supabaseUrl = 'https://rgddlworlyuvvtwvsofo.supabase.co';
// const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZGRsd29ybHl1dnZ0d3Zzb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNjEzMjUsImV4cCI6MjA2ODczNzMyNX0.suljQ88eDZhvQ5lK6oTSzfxXXWvbKiQxangn9M4HsiM';


const supabaseUrl = 'https://vhjetkdfxqbogbegboic.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamV0a2RmeHFib2diZWdib2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODU4MzgsImV4cCI6MjA3NjE2MTgzOH0.r4GY5UgwRjhicFnnmcRxBySjN7PMJKhImSDHwxqKcyg';


// Create client with bypass RLS option
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Fetch active chips with locations from Supabase
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

export const fetchActiveChipsWithLocations = async () => {
  try {
    console.log('🗺️ [MAP] Fetching active chips with locations...');
    
    // Get cars with assigned chips and location data
    const { data: carsData, error: carsError } = await supabase
      .from('cars')
      .select('id, vin, chip, latitude, longitude, last_location_update, facilityId')
      .not('chip', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('last_location_update', { ascending: false });

    if (carsError) {
      console.error('❌ [MAP] Error fetching cars:', carsError);
      return [];
    }

    console.log('✅ [MAP] Cars with locations fetched:', carsData?.length || 0);

    // Get yard names for all unique facility IDs
    const uniqueFacilityIds = [...new Set(carsData.map(car => car.facilityId))];
    const yardNamesMap = {};
    
    for (const facilityId of uniqueFacilityIds) {
      yardNamesMap[facilityId] = await getYardNameFromId(facilityId);
    }

    // Transform data to match expected format
    const activeChips = carsData.map(car => ({
      id: car.id,
      vin: car.vin,
      chip_id: car.chip, // Map chip to chip_id for compatibility
      chip: car.chip,
      latitude: car.latitude,
      longitude: car.longitude,
      last_location_update: car.last_location_update,
      yard_name: yardNamesMap[car.facilityId] || 'Unknown Yard',
      facilityId: car.facilityId
    }));

    console.log('✅ [MAP] Active chips with locations processed:', activeChips.length);
    return activeChips;
  } catch (error) {
    console.error('❌ [MAP] Exception fetching active chips:', error);
    return [];
  }
};

// Start real-time subscription for location updates
export const startLocationSubscription = (onLocationUpdate) => {
  console.log('🔔 [MAP] Starting location subscription...');
  
  const subscription = supabase
    .channel('location_updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'cars',
        filter: 'chip=not.is.null'
      },
      async (payload) => {
        console.log('📍 [MAP] Location update received:', payload.new);
        
        // Get yard name for the updated chip
        const yardName = await getYardNameFromId(payload.new.facilityId);
        
        // Transform the payload to match expected format
        const updatedChip = {
          id: payload.new.id,
          vin: payload.new.vin,
          chip_id: payload.new.chip,
          chip: payload.new.chip,
          latitude: payload.new.latitude,
          longitude: payload.new.longitude,
          last_location_update: payload.new.last_location_update,
          yard_name: yardName,
          facilityId: payload.new.facilityId
        };
        
        if (onLocationUpdate) {
          onLocationUpdate(updatedChip);
        }
      }
    )
    .subscribe();

  return subscription;
};

// Update chip location in Supabase
export const updateChipLocation = async (chipId, latitude, longitude) => {
  try {
    console.log('📍 [MAP] Updating chip location:', { chipId, latitude, longitude });
    
    const { error } = await supabase
      .from('cars')
      .update({
        latitude: latitude,
        longitude: longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('chip_id', chipId);

    if (error) {
      console.error('❌ [MAP] Error updating chip location:', error);
      return false;
    }

    console.log('✅ [MAP] Chip location updated successfully');
    return true;
  } catch (error) {
    console.error('❌ [MAP] Exception updating chip location:', error);
    return false;
  }
};
