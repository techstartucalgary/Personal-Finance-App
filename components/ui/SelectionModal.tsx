import React from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  ui: {
    surface: string;
    surface2: string;
    border: string;
    text: string;
    mutedText: string;
    backdrop: string;
    accent?: string;
  };
  children: React.ReactNode;
  footer?: React.ReactNode;
  layout?: 'list' | 'tags';
}

export function SelectionModal({
  visible,
  onClose,
  title,
  ui,
  children,
  footer,
  layout = 'list',
}: SelectionModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === 'ios';

  return (
    <Modal
      visible={visible}
      transparent={!isIOS}
      animationType="slide"
      presentationStyle={isIOS ? "pageSheet" : undefined}
      onRequestClose={onClose}
    >
      <ThemedView
        style={[
          styles.container,
          {
            backgroundColor: ui.surface,
            paddingTop: isIOS ? 12 : (insets.top + 16),
            paddingBottom: insets.bottom + 16,
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{title}</ThemedText>
          <View style={styles.headerRight}>
            <Pressable
              onPress={onClose}
              hitSlop={20}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.7 : 1,
                }
              ]}
            >
              <Feather name="x" size={18} color={ui.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            layout === 'tags' && styles.tagsContent,
            { paddingBottom: insets.bottom + 20 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer && (
          <View style={[styles.footer, { borderTopColor: ui.border, paddingBottom: insets.bottom + 16 }]}>
            {footer}
          </View>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    flex: 1,
    textAlign: "center",
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  tagsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
