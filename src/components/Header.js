import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {lightBlueColor} from '../constants/Color';
import {heightPercentageToDP as hp} from '../utils';
import {style} from '../constants/Fonts';

const Header = ({title, onBack, backArrow}) => {
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
      {backArrow && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
      )}
      {!backArrow &&<Text style={styles.headerTitle}></Text>}
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={()=> navigation.navigate("Search")} style={styles.backButton}>
          <Ionicons name="search" size={28} color="black" />
        </TouchableOpacity>
    </View>
  );
};

const styles = {
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: hp(7),
    backgroundColor: '#fff',
    marginTop: 38,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
};

export default Header;
