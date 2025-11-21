import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../lib/supabaseClient';
import { heightPercentageToDP as hp } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { useFocusEffect } from '@react-navigation/native';

const YardListScreen = ({ navigation }) => {
  const [yards, setYards] = useState([]);
  const [filteredYards, setFilteredYards] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  // Load yards from Supabase
  const loadYards = async () => {
    try {
      setLoading(true);
      console.log('🔄 [YardListScreen] Loading yards from Supabase...');

      const { data: supabaseYards, error } = await supabase
        .from('facility')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('❌ [YardListScreen] Supabase fetch error:', error);
        setYards([]);
        setFilteredYards([]);
        return;
      }

      console.log('✅ [YardListScreen] Fetched from Supabase:', supabaseYards.length, 'yards');

      // Map Supabase data to app format
      const mappedYards = supabaseYards.map(yard => ({
        id: yard.id.toString(),
        name: yard.name || 'Unnamed Yard',
        address: yard.address ? `${yard.address}${yard.city ? ', ' + yard.city : ''}` : 'No Address',
        slots: yard.parkingSlots ? parseInt(yard.parkingSlots) : 50,
      }));

      setYards(mappedYards);
      setFilteredYards(mappedYards);

      console.log('📊 [YardListScreen] Yards loaded:', mappedYards.length);
    } catch (error) {
      console.error('❌ [YardListScreen] Error loading yards:', error);
      setYards([]);
      setFilteredYards([]);
    } finally {
      setLoading(false);
    }
  };

  // Load yards when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadYards();
    }, [])
  );

  // Search filter
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredYards(yards);
    } else {
      const lowerText = searchText.toLowerCase();
      const filtered = yards.filter(yard =>
        yard?.name?.toLowerCase().includes(lowerText) ||
        yard?.address?.toLowerCase().includes(lowerText)
      );
      setFilteredYards(filtered);
    }
  }, [searchText, yards]);

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          navigation.navigate('YardPolygonsMapScreen', {
            yardId: item.id,
            yardName: item.name,
            yardAddress: item.address,
          });
        }}>
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={24} color="#613EEA" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <Text style={styles.slots}>Slots: {item.slots}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Parking Yards</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search yards..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading yards...</Text>
          </View>
        ) : filteredYards.length > 0 ? (
          <FlatList
            data={filteredYards}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Parking Yards Found</Text>
            <Text style={styles.emptySubtext}>
              {searchText ? 'Try a different search term' : 'No yards available'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    paddingTop: spacings.large,
    paddingHorizontal: spacings.large,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacings.large,
  },
  title: {
    fontSize: style.fontSizeLargeXX.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c1b7ed',
    borderRadius: 10,
    paddingHorizontal: spacings.normal,
    marginBottom: spacings.large,
    backgroundColor: '#fff',
    height: hp(5.5),
  },
  searchInput: {
    flex: 1,
    marginLeft: spacings.small,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#000',
  },
  listContainer: {
    paddingBottom: spacings.large,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: spacings.normal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacings.xxxLarge,
  },
  iconContainer: {
    backgroundColor: '#f3f0ff',
    borderRadius: 8,
    padding: spacings.small,
    marginRight: spacings.normal,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: style.fontSizeSmall2x.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#1a1a1a',
    marginBottom: spacings.xxsmall,
  },
  address: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    marginBottom: spacings.xxsmall,
  },
  slots: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#613EEA',
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  arrowContainer: {
    marginLeft: spacings.small,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacings.ExtraLarge3x,
  },
  emptyText: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#333',
    marginTop: spacings.large,
    marginBottom: spacings.normal,
  },
  emptySubtext: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    textAlign: 'center',
  },
});

export default YardListScreen;

