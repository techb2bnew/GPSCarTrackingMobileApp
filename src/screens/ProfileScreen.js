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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { clearUser } from '../redux/userSlice';
import AnimatedLottieView from 'lottie-react-native';
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, greenColor, lightGrayColor, whiteColor } from '../constants/Color';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from '../utils';
import { BaseStyle } from '../constants/Style';

const { flex, alignItemsCenter, alignJustifyCenter, resizeModeContain, flexDirectionRow, justifyContentSpaceBetween, textAlign } = BaseStyle;

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
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
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setEditData({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          company: parsedUser.company || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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

      // Count vehicles and chips
      let latestUpdateTime = null;
      for (const key of yardKeys) {
        const vehicles = await AsyncStorage.getItem(key);
        if (vehicles) {
          const parsedVehicles = JSON.parse(vehicles);
          totalVehicles += parsedVehicles.length;
          
          // Count active and inactive chips
          const activeVehicles = parsedVehicles.filter(v => v.chipId && v.isActive);
          const inactiveVehicles = parsedVehicles.filter(v => v.chipId && !v.isActive);
          activeChips += activeVehicles.length;
          inactiveChips += inactiveVehicles.length;
          
          // Count low battery chips (mock data - in real app this would come from chip data)
          lowBatteryChips += Math.floor(activeVehicles.length * 0.1); // 10% of active chips
          
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
      const updatedUser = {
        ...user,
        ...editData,
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowEditModal(false);
      setIsEditing(false);
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
    });
    setShowEditModal(false);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      dispatch(clearUser());
      console.log('User data removed from AsyncStorage');
      // Navigate to login screen or handle logout
      navigation.navigate('LoginScreen');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
    setShowLogoutModal(false);
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
    setIsLoggingOut(false);
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'Mark Evans').charAt(0).toUpperCase()}
          </Text>
        </View>
        {/* <TouchableOpacity
          style={styles.editAvatarButton}
          onPress={handleEditProfile}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={16} color="#fff" />
        </TouchableOpacity> */}
      </View>
      
      <Text style={styles.userName}>{user?.name || 'Mark Evans'}</Text>
      <Text style={styles.userEmail}>{user?.email || 'mark.evans@example.com'}</Text>
      
      {/* <TouchableOpacity
        style={styles.editProfileButton}
        onPress={handleEditProfile}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={20} color="#613EEA" />
        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
      </TouchableOpacity> */}
    </View>
  );

  const renderProfileInfo = () => (
    <View style={styles.profileInfoContainer}>
      <Text style={styles.sectionTitle}>Profile Information</Text>
      
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="person-outline" size={20} color="#613EEA" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.name || 'Mark Evans'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="mail-outline" size={20} color="#613EEA" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'mark.evans@example.com'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="call-outline" size={20} color="#613EEA" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || '+1 (555) 123-4567'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="business-outline" size={20} color="#613EEA" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{user?.company || 'Tech Solutions Inc.'}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Activity Stats</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalVehicles}</Text>
          <Text style={styles.statLabel}>Total Vehicles</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalYards}</Text>
          <Text style={styles.statLabel}>Parking Yards</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: greenColor }]}>{stats.activeChips}</Text>
          <Text style={styles.statLabel}>Active Chips</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats.inactiveChips}</Text>
          <Text style={styles.statLabel}>Inactive Chips</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.lowBatteryChips}</Text>
          <Text style={styles.statLabel}>Low Battery</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#613EEA' }]}>{stats.lastActivity}</Text>
          <Text style={styles.statLabel}>Last Activity</Text>
        </View>
      </View>
    </View>
  );


  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelEdit}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleCancelEdit}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editData.name}
                onChangeText={(text) => setEditData({...editData, name: text})}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={editData.email}
                onChangeText={(text) => setEditData({...editData, email: text})}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={editData.phone}
                onChangeText={(text) => setEditData({...editData, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.textInput}
                value={editData.company}
                onChangeText={(text) => setEditData({...editData, company: text})}
                placeholder="Enter your company name"
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProfileHeader()}
        {renderProfileInfo()}
        {renderStatsCard()}
      </ScrollView>

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
    paddingTop: 50,
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
    alignItems:"center",
    justifyContent:"center"
  },
  content: {
    flex: 1,
    paddingHorizontal: spacings.large,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacings.xLarge,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacings.large,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#613EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
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
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: blackColor,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: grayColor,
    marginBottom: spacings.large,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: blackColor,
    marginBottom: spacings.large,
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
    marginBottom: spacings.small,
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
    fontWeight: 'bold',
    color: '#613EEA',
    marginBottom: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: whiteColor,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: blackColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacings.large,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: blackColor,
  },
  closeButton: {
    padding: spacings.small,
  },
  modalBody: {
    padding: spacings.large,
  },
  inputContainer: {
    marginBottom: spacings.large,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: blackColor,
    marginBottom: spacings.small,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: spacings.medium,
    fontSize: 16,
    color: blackColor,
    backgroundColor: whiteColor,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacings.large,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: spacings.small,
    paddingVertical: spacings.medium,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: grayColor,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    marginLeft: spacings.small,
    paddingVertical: spacings.medium,
    borderRadius: 10,
    backgroundColor: '#613EEA',
    alignItems: 'center',
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
});

export default ProfileScreen;
