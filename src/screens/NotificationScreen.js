import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  RefreshControl,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useDispatch, useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';
import {
  clearNotifications,
  markAllAsRead,
  addNotification,
} from '../redux/notificationsSlice';
import {loadAndClearBackgroundNotifications, checkBackgroundNotifications} from '../utils/backgroundNotificationStorage';

export default function NotificationScreen({navigation}) {
  const dispatch = useDispatch();
  const notifications = useSelector(
    state => state.notifications?.items || [],
  );
  const [refreshing, setRefreshing] = useState(false);

  // Function to sync background notifications
  const syncBackgroundNotifications = async () => {
    try {
      console.log('📨 [NOTIFICATION_SCREEN] Syncing background notifications...');
      const pending = await loadAndClearBackgroundNotifications();
      if (pending && pending.length > 0) {
        console.log(
          '📨 [NOTIFICATION_SCREEN] Found',
          pending.length,
          'background notifications to sync',
        );
        pending.forEach(item => {
          dispatch(
            addNotification({
              title: item.title,
              body: item.body,
              data: item.data || {},
            }),
          );
        });
        return true; // Success
      }
      return false; // No notifications found
    } catch (error) {
      console.error(
        '❌ [NOTIFICATION_SCREEN] Error syncing background notifications:',
        error,
      );
      return false;
    }
  };

  // Sync background notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      syncBackgroundNotifications();
    }, [dispatch]),
  );

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    
    // First check what's in storage
    const pending = await checkBackgroundNotifications();
    console.log('📥 [NOTIFICATION_SCREEN] Pending notifications in storage:', pending.length);
    
    if (pending.length > 0) {
      Alert.alert(
        'Found Notifications',
        `Found ${pending.length} background notification(s) in storage. Syncing now...`,
      );
    }
    
    const synced = await syncBackgroundNotifications();
    setRefreshing(false);
    
    if (synced) {
      Alert.alert('Success', 'Background notifications synced!');
    } else if (pending.length === 0) {
      Alert.alert('Info', 'No background notifications found in storage.');
    }
  };

  useEffect(() => {
    // Mark all as read when user opens the notification screen
    if (notifications.length > 0) {
      dispatch(markAllAsRead());
    }
  }, [notifications.length, dispatch]);

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.time}>
          {new Date(item.receivedAt).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.message}>{item.body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1}}>
      <ImageBackground style={styles.container} resizeMode="cover">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#613EEA" />
            </TouchableOpacity>
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => dispatch(clearNotifications())}
                style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={40} color="#aaa" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You’ll see important alerts and updates from your yards here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{paddingBottom: 20}}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    refreshButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    card: {
        paddingVertical: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    time: {
        fontSize: 12,
        color: '#808080',
    },
    message: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#e6e6e6',
        marginVertical: 10,
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
    },
    clearButtonText: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        lineHeight: 20,
    },
});
