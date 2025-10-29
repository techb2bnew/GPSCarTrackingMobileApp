import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-simple-toast';
import { useDispatch } from 'react-redux';
import { clearUser } from '../redux/userSlice';
import AnimatedLottieView from 'lottie-react-native';
import { clearAllChips, getChipCounts, getCriticalBatteryChips, clearAllAsyncStorageData } from '../utils/chipManager';
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';
import { supabase } from '../lib/supabaseClient';

const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    contact: '',
    joiningDate: '',
  });
  const [stats, setStats] = useState({
    totalYards: 0,
    totalVehicles: 0,
    activeChips: 0,
    inactiveChips: 0,
    totalOperations: 0,
    lowBatteryChips: 0,
    lastActivity: 'Never',
  });

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
    loadStatsData();
  }, []);

  // Load stats data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStatsData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      // Get user data from AsyncStorage first
      const userData = await AsyncStorage.getItem('user');

      if (userData) {
        const parsedUser = JSON.parse(userData);

        // Fetch latest user data from Supabase
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('email', parsedUser.email)
          .single();
        console.log("data", data);

        if (data && !error) {
          // Update with Supabase data
          console.log('User data from Supabase:', data);
          setUser(data);
          setEditData({
            name: data.name || '',
            email: data.email || '',
            contact: data.contact || '',
            joiningDate: data.joiningDate || '',
          });
          // Update AsyncStorage with latest data
          await AsyncStorage.setItem('user', JSON.stringify(data));
        } else {
          // Fallback to AsyncStorage data
          console.log('Fallback to AsyncStorage data');
          setUser(parsedUser);
          setEditData({
            name: parsedUser.name || '',
            email: parsedUser.email || '',
            contact: parsedUser.contact || '',
            joiningDate: parsedUser.joiningDate || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsData = async () => {
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Filter yard keys
      const yardKeys = keys.filter(key => key.startsWith('yard_') && key.endsWith('_vehicles'));

      let totalYards = 0;
      let totalVehicles = 0;
      let activeChips = 0;
      let inactiveChips = 0;
      let lowBatteryChips = 0;
      let totalOperations = 0;
      let lastActivity = 'Never';

      // Count yards from saved yards
      const savedYards = await AsyncStorage.getItem('parking_yards');
      if (savedYards) {
        const yards = JSON.parse(savedYards);
        totalYards = yards.length;
      } else {
        // Fallback: count from yard keys
        totalYards = yardKeys.length;
      }

      // Count vehicles
      let latestUpdateTime = null;
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          totalVehicles += parsedVehicles.length;

          // Find latest update time
          parsedVehicles.forEach(vehicle => {
            if (vehicle.lastUpdated) {
              const updateTime = new Date(vehicle.lastUpdated);
              if (!latestUpdateTime || updateTime > latestUpdateTime) {
                latestUpdateTime = updateTime;
              }
            }
          });
        }
      }

      // Get chip counts from chipManager (active, inactive)
      const chipCounts = await getChipCounts();
      activeChips = chipCounts.activeCount;
      inactiveChips = chipCounts.inactiveCount;

      // Get critical battery chips (0-20%)
      const criticalChips = await getCriticalBatteryChips();
      lowBatteryChips = criticalChips.length;

      console.log('📊 Profile Stats - Chip Counts from ChipManager:', {
        activeChips,
        inactiveChips,
        lowBatteryChips,
        criticalChipsDetails: criticalChips.map(c => `${c.chipId}: ${c.batteryLevel}%`)
      });

      // Format last activity time
      if (latestUpdateTime) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - latestUpdateTime) / (1000 * 60));

        if (diffInMinutes < 60) {
          lastActivity = `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
          lastActivity = `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
          lastActivity = `${Math.floor(diffInMinutes / 1440)}d ago`;
        }
      }

      // Calculate total operations (this could be based on history or activity logs)
      // For now, we'll use a simple calculation based on vehicle updates
      const activityKeys = keys.filter(key => key.includes('activity') || key.includes('history'));
      totalOperations = activityKeys.length * 10; // Rough estimate

      setStats({
        totalYards,
        totalVehicles,
        activeChips,
        inactiveChips,
        lowBatteryChips,
        totalOperations: totalOperations || (totalVehicles * 3), // Fallback calculation
        lastActivity,
      });

      console.log('Stats loaded:', { totalYards, totalVehicles, activeChips, inactiveChips, lowBatteryChips, totalOperations, lastActivity });
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      console.log('🔄 [ProfileScreen] Updating profile in Supabase...');

      // 1. Update in Supabase first
      const { data, error } = await supabase
        .from('staff')
        .update({
          name: editData.name,
          email: editData.email,
          contact: editData.contact,
          joiningDate: editData.joiningDate,
        })
        .eq('email', user?.email) // Match by current email
        .select();

      if (error) {
        console.error('❌ [ProfileScreen] Supabase update error:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
        return;
      }

      console.log('✅ [ProfileScreen] Updated in Supabase:', data);

      // 2. Update local storage
      const updatedUser = {
        ...user,
        ...editData,
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      console.log('✅ [ProfileScreen] Updated in local storage');

      // 3. Refetch user data to ensure sync
      await loadUserData();

      setShowEditModal(false);
      setIsEditing(false);

      Toast.show('✅ Profile updated successfully!', Toast.LONG);
    } catch (error) {
      console.error('❌ [ProfileScreen] Error saving profile:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.contact || '',
      joiningDate: user?.joiningDate || '',
    });
    setShowEditModal(false);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      console.log('🚀 [ProfileScreen] Starting logout process...');

      // Use the comprehensive logout function that clears ALL AsyncStorage data
      const clearResult = await clearAllAsyncStorageData();

      if (clearResult.success) {
        console.log(`✅ [ProfileScreen] Successfully cleared all ${clearResult.clearedKeys} AsyncStorage keys`);
      } else {
        console.warn(`⚠️ [ProfileScreen] Cleared ${clearResult.clearedKeys}/${clearResult.totalKeys} keys. ${clearResult.remainingKeys} keys remain`);
        if (clearResult.errors.length > 0) {
          console.error('❌ [ProfileScreen] Errors during cleanup:', clearResult.errors);
        }
      }

      // Clear user data from Redux
      dispatch(clearUser());
      console.log('✅ [ProfileScreen] User data cleared from Redux');

      console.log('🎉 [ProfileScreen] Logout process completed successfully');

      // Navigate to login screen
      navigation.navigate('LoginScreen');
    } catch (error) {
      console.error('❌ [ProfileScreen] Critical error during logout:', error);
      // Still navigate to login even if there's an error
      navigation.navigate('LoginScreen');
    }
    setShowLogoutModal(false);
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
    setIsLoggingOut(false);
  };

  const renderProfileHeader = () => {
    // Capitalize first letter of each word in name
    const capitalizedName = user?.name
      ? user.name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      : 'User';

    // Format joining date
    const joiningDate = user?.joiningDate
      ? new Date(user.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently';

    return (
      <View style={styles.profileHeaderCard}>
        {/* Gradient Background */}
        <View style={styles.profileHeaderGradient}>
          <View style={styles.profileHeader}>
            {/* Avatar on Left */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarOuter}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {capitalizedName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info on Right */}
            <View style={styles.profileInfoRight}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{capitalizedName}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
              </View>
              <View style={styles.emailRow}>
                <Ionicons name="mail-outline" size={16} color="#888" />
                <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
              </View>
              <View style={styles.memberSinceRow}>
                <View style={styles.memberSinceContainer}>
                  <Ionicons name="calendar" size={13} color="#613EEA" />
                  <Text style={styles.memberSinceText}>Joined {joiningDate}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderProfileInfo = () => {
    // Capitalize first letter of each word in name
    const capitalizedName = user?.name
      ? user.name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      : 'User';

    return (
      <View style={styles.profileInfoContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color="#613EEA" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person-outline" size={20} color="#613EEA" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{capitalizedName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail-outline" size={20} color="#613EEA" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'user@example.com'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="call-outline" size={20} color="#613EEA" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.contact || 'Not Available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#613EEA" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joining Date</Text>
              <Text style={styles.infoValue}>
                {user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Not Available'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // STATS SECTION - COMMENTED FOR NOW
  // Uncomment if user_id columns added to database
  // ============================================
  // const renderStatsCard = () => (
  //   <View style={styles.statsContainer}>
  //     <Text style={styles.sectionTitle}>Activity Stats</Text>
  //
  //     {/* Top Row - 3 Cards */}
  //     <View style={styles.statsRowTop}>
  //       <View style={styles.statCardSmall}>
  //         <Text style={styles.statNumber}>{stats.totalVehicles}</Text>
  //         <Text style={styles.statLabelSmall}>Total Vehicles</Text>
  //       </View>
  //
  //       <View style={styles.statCardSmall}>
  //         <Text style={styles.statNumber}>{stats.totalYards}</Text>
  //         <Text style={styles.statLabelSmall}>Parking Yards</Text>
  //       </View>
  //
  //       <View style={styles.statCardSmall}>
  //         <Text style={[styles.statNumber, { color: greenColor }]}>{stats.activeChips}</Text>
  //         <Text style={styles.statLabelSmall}>Active Chips</Text>
  //       </View>
  //     </View>
  //
  //     {/* Bottom Row - 2 Large Cards */}
  //     <View style={styles.statsRowBottom}>
  //       <View style={styles.statCardLarge}>
  //         <Text style={[styles.statNumberLarge, { color: '#FF6B6B' }]}>{stats.inactiveChips}</Text>
  //         <Text style={styles.statLabelLarge}>Inactive Chips</Text>
  //       </View>
  //
  //       <View style={styles.statCardLarge}>
  //         <Text style={[styles.statNumberLarge, { color: '#FF9500' }]}>{stats.lowBatteryChips}</Text>
  //         <Text style={styles.statLabelLarge}>Low Battery</Text>
  //       </View>
  //     </View>
  //   </View>
  // );

  // ============================================
  // QUICK ACTIONS SECTION
  // ============================================
  const renderQuickActions = () => {
    const quickActions = [
      {
        id: 1,
        icon: 'time-outline',
        label: 'Facility History',
        screen: 'ActivityHistoryScreen',
        color: '#613EEA',
        bgColor: '#F3F0FF',
      },
      {
        id: 2,
        icon: 'information-circle',
        label: 'How It Works',
        screen: 'HowItWorksScreen',
        color: '#2196F3',
        bgColor: '#E3F2FD',
      },
      {
        id: 3,
        icon: 'alert-circle',
        label: 'Report Issue',
        screen: 'ReportIssueScreen',
        color: '#FF6B6B',
        bgColor: '#FFF5F5',
      },
    ];

    const handleActionPress = (action) => {
      if (action.screen) {
        navigation.navigate(action.screen);
      }
    };

    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: action.bgColor }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };


  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancelEdit}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelEdit}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="person-circle-outline" size={28} color="#613EEA" />
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={styles.closeButton}
                >
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="person-outline" size={16} color="#613EEA" /> Full Name
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={editData.name}
                      onChangeText={(text) => setEditData({ ...editData, name: text })}
                      placeholder="Enter your full name"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="mail-outline" size={16} color="#613EEA" /> Email Address
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.disabledInput]}
                      value={editData.email}
                      onChangeText={(text) => setEditData({ ...editData, email: text })}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={false}
                    />
                    <Ionicons name="lock-closed" size={16} color="#999" />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="call-outline" size={16} color="#613EEA" /> Phone Number
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={editData.contact}
                      onChangeText={(text) => setEditData({ ...editData, contact: text })}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="calendar-outline" size={16} color="#613EEA" /> Joining Date
                  </Text>
                  <View style={[styles.inputWrapper, styles.disabledInputWrapper]}>
                    <Ionicons name="calendar" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.disabledInput]}
                      value={editData.joiningDate ? new Date(editData.joiningDate).toLocaleDateString() : ''}
                      editable={false}
                      placeholder="Joining date"
                      placeholderTextColor="#999"
                    />
                    <Ionicons name="lock-closed" size={16} color="#999" />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderLogoutModal = () => (
    <Modal
      visible={showLogoutModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLogoutModal(false)}
    >
      <View style={styles.logoutModalContainer}>
        <View style={styles.logoutModalContent}>
          {isLoggingOut ? (
            <View style={styles.logoutAnimationContainer}>
              <AnimatedLottieView
                source={require('../assets/logout.json')}
                autoPlay
                loop
                style={styles.logoutAnimation}
              />
              <Text style={styles.logoutAnimationText}>Logging out...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.logoutModalTitle}>Logout</Text>
              <Text style={styles.logoutModalMessage}>
                Are you sure you want to logout?
              </Text>
              <View style={styles.logoutButtonRow}>
                <TouchableOpacity
                  style={styles.logoutCancelBtn}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.logoutConfirmBtn}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutConfirmBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, flexDirectionRow, alignItemsCenter]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleOpenLogoutModal}
          style={styles.headerLogoutButton}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#613EEA" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderProfileHeader()}
          {renderProfileInfo()}
          {/* {renderStatsCard()} */}
          {renderQuickActions()}
        </ScrollView>
      )}

      {renderEditModal()}
      {renderLogoutModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: whiteColor,
  },
  header: {
    padding: spacings.xxxLarge,
    paddingTop: Platform.OS === 'ios' ? hp(7) : hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: spacings.small,
    marginRight: spacings.xxLarge,
  },
  headerTitle: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    flex: 1,
  },
  headerLogoutButton: {
    padding: spacings.normal,
    borderRadius: 5,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flex: 1,
    paddingHorizontal: spacings.large,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginVertical: spacings.large,
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  profileHeaderGradient: {
    background: 'linear-gradient(135deg, #F8F9FF 0%, #FFFFFF 100%)',
    backgroundColor: '#F8F9FF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#613EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfoRight: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    marginLeft: 0,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 15,
    color: '#666666',
    marginLeft: 8,
    fontWeight: '500',
  },
  memberSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0D4FF',
  },
  memberSinceText: {
    fontSize: 12,
    color: '#613EEA',
    marginLeft: 6,
    fontWeight: '700',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#613EEA',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: whiteColor,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.medium,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#613EEA',
  },
  editProfileButtonText: {
    color: '#613EEA',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  profileInfoContainer: {
    marginBottom: spacings.xLarge,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: blackColor,
    marginVertical: spacings.large
  },
  editIconButton: {
    backgroundColor: '#f3f0ff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.large,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacings.large,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: grayColor,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: blackColor,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: spacings.xLarge,
  },
  statsRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardSmall: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: 12,
    width: '31.5%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardLarge: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: 18,
    width: '48.5%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#613EEA',
    marginBottom: 4,
  },
  statNumberLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#613EEA',
    marginBottom: 6,
  },
  statLabelSmall: {
    fontSize: 10,
    color: grayColor,
    textAlign: 'center',
    lineHeight: 12,
    fontWeight: '600',
  },
  statLabelLarge: {
    fontSize: 12,
    color: grayColor,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '600',
  },
  // Old styles (can remove if not used)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.medium,
    width: '31%',
    marginBottom: spacings.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    color: grayColor,
    textAlign: 'center',
    lineHeight: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: whiteColor,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '100%',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: blackColor,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: blackColor,
  },
  disabledInputWrapper: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e8e8e8',
  },
  disabledInput: {
    color: '#999',
  },
  inputHelperText: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#613EEA',
    shadowColor: '#613EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: whiteColor,
    fontSize: 16,
    fontWeight: '600',
  },
  // Logout Card Styles
  logoutContainer: {
    marginBottom: spacings.large,
  },
  logoutCard: {
    backgroundColor: whiteColor,
    borderRadius: 12,
    padding: spacings.large,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacings.large,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: blackColor,
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 14,
    color: grayColor,
  },
  // Logout Modal Styles (matching drawer menu style)
  logoutModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: wp('80%'),
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: blackColor,
    marginBottom: 10,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: grayColor,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  logoutButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutCancelBtnText: {
    color: grayColor,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutConfirmBtn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'red',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    color: whiteColor,
    fontSize: 16,
    fontWeight: '600',
  },
  // Logout Animation Styles
  logoutAnimationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoutAnimation: {
    width: 100,
    height: 100,
  },
  logoutAnimationText: {
    fontSize: 16,
    color: grayColor,
    marginTop: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: grayColor,
  },
  inputHelperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: Platform.OS === 'android' ? hp(10) : spacings.xLarge,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: whiteColor,
    borderRadius: 16,
    padding: spacings.large,
    width: '48%',
    marginBottom: spacings.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacings.medium,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: blackColor,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ProfileScreen;
