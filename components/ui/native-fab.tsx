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
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  type ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { getColors } from "@/constants/authTokens";
import { useColorScheme } from "@/hooks/use-color-scheme";

const IOS_SIZE = 58;
const ANDROID_SIZE = 56;
const VISUAL_BOTTOM_ADJUSTMENT = 10;

type NativeFabProps = {
  accessibilityLabel: string;
  androidIconSource?: ImageSourcePropType;
  bottom: number;
  fallbackFeatherName?: React.ComponentProps<typeof Feather>["name"];
  iosSystemName?: SFSymbol;
  onPress: () => void;
  inverted?: boolean;
};

export function NativeFab({
  accessibilityLabel,
  androidIconSource,
  bottom,
  fallbackFeatherName,
  iosSystemName = "plus",
  inverted = false,
  onPress,
}: NativeFabProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const colorScheme = scheme;
  const surfaceColor = inverted
    ? scheme === "dark"
      ? "#000000"
      : "#FFFFFF"
    : colors.primaryBtn;
  const iconColor = inverted
    ? scheme === "dark"
      ? "#FFFFFF"
      : "#000000"
    : colors.primaryText;
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
              systemName={iosSystemName}
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
                source={androidIconSource ?? require("../../assets/icons/add.xml")}
                size={24}
                tint={iconColor}
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
          {fallbackFeatherName ? (
            <Feather name={fallbackFeatherName} size={28} color={iconColor} />
          ) : (
            <IconSymbol name="plus" size={28} color={iconColor} />
          )}
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
