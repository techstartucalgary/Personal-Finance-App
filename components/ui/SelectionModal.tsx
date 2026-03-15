import React from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "../themed-text";

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
  };
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SelectionModal({
  visible,
  onClose,
  title,
  ui,
  children,
  footer,
}: SelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: ui.backdrop }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: ui.surface2,
              borderColor: ui.border
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: ui.border }]}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>{title}</ThemedText>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {children}
          </ScrollView>

          {footer && (
            <View style={[styles.footer, { borderTopColor: ui.border }]}>
              {footer}
            </View>
          )}

          <Pressable
            style={[styles.cancelButton, { borderTopColor: ui.border }]}
            onPress={onClose}
          >
            <ThemedText style={{ color: ui.text, fontWeight: "600" }}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
