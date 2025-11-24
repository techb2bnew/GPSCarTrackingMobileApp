import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {lightBlueColor} from '../constants/Color';
import {heightPercentageToDP as hp} from '../utils';
import {style, spacings} from '../constants/Fonts';

const Header = ({title, onBack, backArrow, showSearch}) => {
  const navigation = useNavigation();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };
  return (
    <View style={styles.headerContainer}>
      {backArrow ? (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholderView} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {showSearch ? (
        <TouchableOpacity onPress={()=> navigation.navigate("SearchScreen")} style={styles.backButton}>
          <Ionicons name="search" size={28} color="black" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholderView} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacings.normal,
    height: hp(7),
    backgroundColor: '#fff',
    marginTop: 38,
  },
  backButton: {
    padding: spacings.small,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderView: {
    width: 40,
  },
  headerTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#252837',
    flex: 1,
    textAlign: 'center',
  },
});

export default Header;
