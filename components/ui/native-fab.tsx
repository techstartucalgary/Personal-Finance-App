import {
  FloatingActionButton as AndroidFloatingActionButton,
  Host as AndroidHost,
  Icon as AndroidIcon,
} from "@expo/ui/jetpack-compose";
import {
  Host as IOSHost,
  Image as IOSImage,
  ZStack as IOSZStack,
} from "@expo/ui/swift-ui";
import { frame, glassEffect, onTapGesture } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";

const IOS_SIZE = 58;
const ANDROID_SIZE = 56;
const VISUAL_BOTTOM_ADJUSTMENT = 10;

type NativeFabProps = {
  accessibilityLabel: string;
  bottom: number;
  onPress: () => void;
};

export function NativeFab({
  accessibilityLabel,
  bottom,
  onPress,
}: NativeFabProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const colorScheme = scheme;
  const surfaceColor = colors.primaryBtn;
  const iconColor = colors.primaryText;
  const anchoredBottom = Math.max(bottom - VISUAL_BOTTOM_ADJUSTMENT, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          bottom: anchoredBottom,
          right: 16,
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <IOSHost colorScheme={colorScheme} style={{ width: IOS_SIZE, height: IOS_SIZE }}>
          <IOSZStack
            alignment="center"
            modifiers={[
              frame({ width: IOS_SIZE, height: IOS_SIZE }),
              glassEffect({
                glass: {
                  variant: "regular",
                  interactive: true,
                  tint: surfaceColor,
                },
                shape: "circle",
              }),
              onTapGesture(onPress),
            ]}
          >
            <IOSImage
              systemName="plus"
              size={22}
              color={iconColor}
            />
          </IOSZStack>
        </IOSHost>
      ) : Platform.OS === "android" ? (
        <AndroidHost
          matchContents
          colorScheme={colorScheme}
          style={{ width: ANDROID_SIZE, height: ANDROID_SIZE }}
        >
          <AndroidFloatingActionButton
            onClick={onPress}
            containerColor={surfaceColor}
          >
            <AndroidFloatingActionButton.Icon>
              <AndroidIcon
                source={require("../../assets/icons/add.xml")}
                size={24}
                tintColor={iconColor}
                contentDescription={accessibilityLabel}
              />
            </AndroidFloatingActionButton.Icon>
          </AndroidFloatingActionButton>
        </AndroidHost>
      ) : (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          style={({ pressed }) => [
            styles.fallback,
            {
              backgroundColor: surfaceColor,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <IconSymbol name="plus" size={28} color={iconColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    width: IOS_SIZE,
    height: IOS_SIZE,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.18)",
  },
});
