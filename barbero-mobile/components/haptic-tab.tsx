import * as Haptics from 'expo-haptics';
import {
  Pressable,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';

type HapticTabProps = Omit<PressableProps, 'style'> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function HapticTab({ onPressIn, style, ...props }: HapticTabProps) {
  return (
    <Pressable
      {...props}
      style={[styles.tab, style as StyleProp<ViewStyle>]}
      onPressIn={(ev: GestureResponderEvent) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
    />
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
