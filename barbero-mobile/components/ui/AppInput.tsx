import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from "react-native";
import { Colors } from "@/constants/colors";
import AppIcon, { IconName } from "./AppIcon";

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  containerStyle?: ViewStyle;
}

export default function AppInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  leftIcon,
  containerStyle,
  style,
  ...rest
}: AppInputProps) {
  const [isPasswordHidden, setIsPasswordHidden] = useState(secureTextEntry);

  const togglePasswordVisibility = () => {
    setIsPasswordHidden((prev) => !prev);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : styles.inputWrapperDefault,
        ]}
      >
        {leftIcon ? (
          <View style={styles.leftIconContainer}>
            <AppIcon name={leftIcon} size={18} color={error ? Colors.error : Colors.primary} />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.disabled}
          secureTextEntry={secureTextEntry ? isPasswordHidden : false}
          style={[styles.input, style]}
          {...rest}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isPasswordHidden ? "Show password" : "Hide password"}
          >
            <AppIcon
              name={isPasswordHidden ? "eye" : "eye-off"}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputWrapperDefault: {
    borderColor: Colors.border,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  leftIconContainer: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: Colors.text,
  },
  rightIconButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
});
