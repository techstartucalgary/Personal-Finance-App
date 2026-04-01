import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
                  backgroundColor: ui.surface2,
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
          keyboardShouldPersistTaps="handled"
        >
          {children}
          
          {footer && (
            <View style={[{ paddingTop: 16, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ui.border }, layout === 'tags' && { width: '100%' }]}>
              {footer}
            </View>
          )}
        </ScrollView>
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
});
