import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Pressable, View } from 'react-native';
import { blueColor, orangeColor, whiteColor } from '../constants/Color';
import { spacings, style } from '../constants/Fonts';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const iconMap = {
    FontAwesome,
    MaterialIcons,
    Ionicons,
    // Add more if you use other icon libraries
};
const CustomButton = ({
    title,
    onPress,
    style,
    textStyle,
    loading,
    disabled = false,
    iconType, // e.g. "FontAwesome"
    iconName, // e.g. "car"
    iconSize = 18,
    iconColor = whiteColor,
}) => {
    const IconComponent = iconType ? iconMap[iconType] : null;

    return (
        <Pressable
            style={[
                styles.button,
                style,
                disabled && styles.disabledButton,
            ]}
            onPress={() => {
                console.log(`${title} button pressed`);
                if (!disabled && !loading) { // Prevent pressing while loading
                    onPress();
                }
            }}
            activeOpacity={0.8}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color={whiteColor} /> // Show loading indicator
            ) : (
                <View style={{ flexDirection: "row",alignItems:"center",justifyContent:"center" }}>
                    {IconComponent && iconName && (
                        <IconComponent
                            name={iconName}
                            size={iconSize}
                            color={iconColor}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <Text style={[styles.buttonText, textStyle]}>{title}</Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: blueColor,
        padding: spacings.xLarge,
        borderRadius: 15,
        marginBottom: spacings.Large1x,
        alignItems: "center",
        justifyContent: "center"
    },
    buttonText: {
        color: whiteColor,
        fontSize: style.fontSizeNormal1x.fontSize,
        fontWeight: style.fontWeightMedium.fontWeight,
    },
    disabledButton: {
        backgroundColor: '#D1D4D6',
    }
});

export default CustomButton;
