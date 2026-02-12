import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { heightPercentageToDP as hp } from '../utils';
import LinearGradient from 'react-native-linear-gradient';
import { spacings, style } from '../constants/Fonts';
import {
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
  blackColor,
  lightBlackBackground,
  lightBlackBorder,
} from '../constants/Color';
import { useFocusEffect } from '@react-navigation/native';

const YARD_LIST_CACHE_KEY = 'yard_list_screen';

const YardListScreen = ({ navigation }) => {
  const [yards, setYards] = useState([]);
  const [filteredYards, setFilteredYards] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const hasShownCacheRef = useRef(false);

  // Load yards: pehle local storage se dikhao, phir API se update + cache save
  const loadYards = async () => {
    let hadCachedData = false;
    hasShownCacheRef.current = false;
    setLoading(true);

    try {
      // 1) Pehle cache se load – turant list dikhe, loading band
      const cachedRaw = await AsyncStorage.getItem(YARD_LIST_CACHE_KEY);
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          const list = Array.isArray(parsed?.yards) ? parsed.yards : (Array.isArray(parsed) ? parsed : []);
          if (list.length >= 0) {
            setYards(list);
            setFilteredYards(list);
            hadCachedData = true;
            hasShownCacheRef.current = true;
            setLoading(false);
          }
        } catch (e) {
          // ignore invalid cache
        }
      }

      // 2) API se fetch
      const { data: supabaseYards, error } = await supabase
        .from('facility')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('❌ [YardListScreen] Supabase fetch error:', error);
        if (!hadCachedData) {
          setYards([]);
          setFilteredYards([]);
        }
        return;
      }

      const mappedYards = (supabaseYards || []).map(yard => ({
        id: yard.id.toString(),
        name: yard.name || 'Unnamed Yard',
        address: yard.address ? `${yard.address}${yard.city ? ', ' + yard.city : ''}` : 'No Address',
        slots: yard.parkingSlots ? parseInt(yard.parkingSlots) : 50,
      }));

      setYards(mappedYards);
      setFilteredYards(mappedYards);
      await AsyncStorage.setItem(YARD_LIST_CACHE_KEY, JSON.stringify({ yards: mappedYards }));
    } catch (error) {
      console.error('❌ [YardListScreen] Error loading yards:', error);
      if (!hadCachedData) {
        setYards([]);
        setFilteredYards([]);
      }
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
            <Ionicons name="business" size={24} color={blackColor} />
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
    <LinearGradient
      colors={[
        gradientSoftTop,
        gradientSoftMid1,
        gradientSoftMid2,
        gradientSoftMid3,
        gradientSoftMid4,
        gradientSoftBottom,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
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

        {/* List – cache mila to loading mat dikhao */}
        {(loading && !hasShownCacheRef.current) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={blackColor} />
            <Text style={styles.loadingText}>Loading yards...</Text>
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
    </LinearGradient>
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
    borderWidth: 1.5,
    borderColor: lightBlackBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: spacings.large,
    backgroundColor: lightBlackBackground,
    height: hp(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: lightBlackBackground,
    borderRadius: 8,
    padding: spacings.small,
    marginRight: spacings.normal,
    borderWidth: 1,
    borderColor: lightBlackBorder,
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
    color: blackColor,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  arrowContainer: {
    marginLeft: spacings.small,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacings.ExtraLarge3x || 40,
  },
  loadingText: {
    marginTop: spacings.large,
    fontSize: style.fontSizeNormal.fontSize,
    color: '#666',
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

