import { Tokens, getColors } from "@/constants/authTokens";
import { useAuthContext } from "@/hooks/use-auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateAPIUrl } from "@/utils/apiUrlGenerator";
import Feather from "@expo/vector-icons/Feather";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { fetch as expoFetch } from "expo/fetch";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const CREATE_NEW = "__CREATE_NEW__";

type ToolOption = {
  id?: string | number;
  value: string;
  name?: string;
  label: string;
};

type AdaptiveGlassProps = {
  children: React.ReactNode;
  colorScheme: "light" | "dark";
  style: StyleProp<ViewStyle>;
};

function AdaptiveGlass({ children, colorScheme, style }: AdaptiveGlassProps) {
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView
        colorScheme={colorScheme}
        glassEffectStyle="regular"
        isInteractive
        tintColor={
          colorScheme === "dark"
            ? "rgba(38, 38, 40, 0.54)"
            : "rgba(255, 255, 255, 0.58)"
        }
        style={style}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={85} tint="systemMaterial" style={style}>
        {children}
      </BlurView>
    );
  }

  return <View style={style}>{children}</View>;
}

function GeneratingReplyIndicator({
  color,
  mutedColor,
}: {
  color: string;
  mutedColor: string;
}) {
  const dotAnimations = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const loops = dotAnimations.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(dot, {
            duration: 360,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            duration: 360,
            easing: Easing.in(Easing.quad),
            toValue: 0.35,
            useNativeDriver: true,
          }),
          Animated.delay((dotAnimations.length - index - 1) * 140),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dotAnimations]);

  return (
    <View style={styles.generatingContent}>
      <View style={styles.generatingDots} accessibilityLabel="Generating reply">
        {dotAnimations.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.generatingDot,
              {
                backgroundColor: color,
                opacity: dot,
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [3, -3],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.generatingText, { color: mutedColor }]}>
        Generating reply
      </Text>
    </View>
  );
}

export default function ChatAI() {
  const scheme = useColorScheme();
  const colorScheme = (scheme ?? "light") as "light" | "dark";
  const C = getColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [selectedMenuOption, setSelectedMenuOption] = useState<{
    menuId: string;
    res: ToolOption;
  } | null>(null);
  const [sentMenuOptions, setSentMenuOptions] = useState<Set<string>>(
    new Set(),
  );
  const [categoryNameInputs, setCategoryNameInputs] = useState<
    Record<string, string>
  >({});

  const { session } = useAuthContext();
  const apiUrl = generateAPIUrl("/api/chat");

  const palette = useMemo(
    () => ({
      page: C.bg,
      surface: C.surface,
      surface2: C.surface2,
      text: C.text,
      muted: C.muted,
      border: C.line,
      chipBorder: C.chipBorder,
      accent: C.accent,
      accentSoft:
        colorScheme === "dark" ? "rgba(121,215,190,0.16)" : "rgba(31,111,91,0.12)",
      userBubble: colorScheme === "dark" ? "#EDEDED" : "#111111",
      userText: colorScheme === "dark" ? "#111111" : "#FFFFFF",
      disabled: colorScheme === "dark" ? "#3A3A3C" : "#DADAE0",
    }),
    [C, colorScheme],
  );

  const chatFetch: typeof globalThis.fetch = async (input, init) => {
    console.log("Chat request started", { apiUrl });
    const response = await expoFetch(input, init);
    console.log("Chat response received", {
      apiUrl,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
    });

    if (!response.ok) {
      console.error("Chat error response body", await response.clone().text());
    }

    return response as Response;
  };

  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript || "");
  });

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return undefined;
    }

    const showSubscription = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const startListening = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (result.granted) {
      setRecognizing(true);
      setTranscript("");
      ExpoSpeechRecognitionModule.start({ lang: "en-US" });
    }
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setRecognizing(false);
    if (transcript) {
      setInput(transcript);
    }
  };

  const handleSendMessage = () => {
    const nextMessage = input.trim();
    if (!nextMessage) return;
    sendMessage({ text: nextMessage });
    setInput("");
    setTranscript("");
  };

  const markMenuSent = (menuId: string, value?: string) => {
    setSentMenuOptions((prev) => {
      const next = new Set(prev);
      next.add(menuId);
      if (value) next.add(`${menuId}-${value}`);
      return next;
    });
  };

  const sendSelectedOption = (menuId: string, option: ToolOption, text: string) => {
    sendMessage({ text });
    markMenuSent(menuId, option.value);
    setSelectedMenuOption(null);
  };

  const { messages, error, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      fetch: chatFetch,
      api: apiUrl,
      body: {
        profile_id: session?.user.id,
        token: session?.access_token,
      },
    }),
    onError: (error) => console.error("Chat request failed", { apiUrl, error }),
  });
  const isGenerating = status === "submitted" || status === "streaming";

  const renderOptionRows = (
    menuId: string,
    options: ToolOption[],
    isMenuSent: boolean,
  ) =>
    options.map((option) => {
      const wasOptionSent =
        isMenuSent && sentMenuOptions.has(`${menuId}-${option.value}`);
      const selected = selectedMenuOption?.menuId === menuId &&
        selectedMenuOption.res.value === option.value;
      const isCreateNewRow = option.value === CREATE_NEW;

      return (
        <Pressable
          key={`${option.id ?? option.value}`}
          disabled={isMenuSent}
          onPress={() => setSelectedMenuOption({ menuId, res: option })}
          style={({ pressed }) => [
            styles.optionRow,
            {
              backgroundColor: wasOptionSent || selected ? palette.accentSoft : palette.surface2,
              borderColor: wasOptionSent || selected ? palette.accent : palette.chipBorder,
              opacity: isMenuSent && !wasOptionSent ? 0.55 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.radio,
              { borderColor: wasOptionSent || selected ? palette.accent : palette.muted },
            ]}
          >
            {wasOptionSent || selected ? (
              <View style={[styles.radioDot, { backgroundColor: palette.accent }]} />
            ) : null}
          </View>
          <Text
            style={[
              styles.optionLabel,
              {
                color: palette.text,
                fontFamily:
                  wasOptionSent || isCreateNewRow
                    ? Tokens.font.semiFamily
                    : Tokens.font.family,
                fontStyle: isCreateNewRow ? "italic" : "normal",
              },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    });

  const renderConfirmButton = (
    menuId: string,
    title: string,
    disabled: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.confirmButton,
        {
          backgroundColor: disabled ? palette.disabled : palette.text,
          opacity: pressed && !disabled ? 0.78 : 1,
        },
      ]}
    >
      <Text style={[styles.confirmButtonText, { color: C.primaryText }]}>
        {title}
      </Text>
    </Pressable>
  );

  const renderToolCard = (
    menuId: string,
    title: string,
    children: React.ReactNode,
    isMenuSent: boolean,
  ) => (
    <View
      key={menuId}
      style={[
        styles.toolCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: isMenuSent ? 0.68 : 1,
        },
      ]}
    >
      <Text style={[styles.toolTitle, { color: palette.text }]}>{title}</Text>
      {children}
    </View>
  );

  const renderPart = (messageId: string, part: any, index: number) => {
    const menuId = `${messageId}-${index}`;
    const isMenuSent = sentMenuOptions.has(menuId);

    if (part.type === "text") {
      return (
        <Text key={menuId} style={[styles.messageText, { color: palette.text }]}>
          {part.text}
        </Text>
      );
    }

    if (
      (part.type === "tool-getAccountsAndCategoriesForSelection" ||
        part.type === "tool-getAccountsAndIncomeCategoriesForSelection") &&
      part.state === "output-available"
    ) {
      const output = part.output as { accounts?: ToolOption[] };
      const selected = selectedMenuOption?.menuId === menuId
        ? selectedMenuOption.res
        : null;

      return renderToolCard(
        menuId,
        "Select an account",
        <>
          {renderOptionRows(menuId, output.accounts ?? [], isMenuSent)}
          {selected && !isMenuSent
            ? renderConfirmButton(menuId, "Confirm account", false, () =>
                sendSelectedOption(
                  menuId,
                  selected,
                  `I selected ${selected.name ?? selected.label} account. Please complete the transaction.`,
                ),
              )
            : null}
        </>,
        isMenuSent,
      );
    }

    if (
      (part.type === "tool-getExpenseCategoriesForSelection" ||
        part.type === "tool-getIncomeCategoriesForSelection") &&
      part.state === "output-available"
    ) {
      const output = part.output as { categories?: ToolOption[] };
      const options = [
        ...(output.categories ?? []),
        {
          id: CREATE_NEW,
          value: CREATE_NEW,
          name: CREATE_NEW,
          label: "+ Create new category",
        },
      ];
      const selected = selectedMenuOption?.menuId === menuId
        ? selectedMenuOption.res
        : null;
      const isCreateNewSelected = selected?.value === CREATE_NEW;
      const newCategoryName = categoryNameInputs[menuId] ?? "";

      return renderToolCard(
        menuId,
        "Select a category",
        <>
          {renderOptionRows(menuId, options, isMenuSent)}
          {isCreateNewSelected && !isMenuSent ? (
            <TextInput
              value={newCategoryName}
              onChangeText={(text) =>
                setCategoryNameInputs((prev) => ({
                  ...prev,
                  [menuId]: text,
                }))
              }
              placeholder="Name the new category"
              placeholderTextColor={palette.muted}
              style={[
                styles.inlineInput,
                {
                  backgroundColor: palette.surface2,
                  borderColor: palette.chipBorder,
                  color: palette.text,
                },
              ]}
            />
          ) : null}
          {selected && !isMenuSent
            ? renderConfirmButton(
                menuId,
                isCreateNewSelected ? "Create and use" : "Confirm category",
                isCreateNewSelected && !newCategoryName.trim(),
                () => {
                  if (isCreateNewSelected) {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    sendMessage({ text: `Use the name '${name}' for my new category.` });
                    markMenuSent(menuId, selected.value);
                    setSelectedMenuOption(null);
                    return;
                  }

                  sendSelectedOption(
                    menuId,
                    selected,
                    `I selected ${selected.name ?? selected.label} category. Please complete the transaction.`,
                  );
                },
              )
            : null}
        </>,
        isMenuSent,
      );
    }

    if (
      (part.type === "tool-requestNewExpenseCategoryName" ||
        part.type === "tool-requestNewIncomeCategoryName") &&
      part.state === "output-available"
    ) {
      const output = part.output as {
        suggestion?: string;
        message?: string;
      };
      const suggestion = output?.suggestion ?? "";
      const currentValue = categoryNameInputs[menuId] ?? suggestion;

      return renderToolCard(
        menuId,
        output?.message ?? "Name your new category",
        <>
          <TextInput
            value={currentValue}
            onChangeText={(text) =>
              setCategoryNameInputs((prev) => ({
                ...prev,
                [menuId]: text,
              }))
            }
            placeholder={suggestion}
            placeholderTextColor={palette.muted}
            editable={!isMenuSent}
            style={[
              styles.inlineInput,
              {
                backgroundColor: isMenuSent ? palette.disabled : palette.surface2,
                borderColor: palette.chipBorder,
                color: isMenuSent ? palette.muted : palette.text,
              },
            ]}
          />
          {!isMenuSent
            ? renderConfirmButton(menuId, "Use this name", !currentValue.trim(), () => {
                const name = currentValue.trim();
                if (!name) return;
                sendMessage({ text: `Use the name '${name}' for my new category.` });
                markMenuSent(menuId);
              })
            : null}
        </>,
        isMenuSent,
      );
    }

    return null;
  };

  if (error) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={[styles.screen, { backgroundColor: palette.page }]}
      >
        <Text style={[styles.errorText, { color: C.danger }]} selectable>
          {error.message}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.screen, { backgroundColor: palette.page }]}
    >
      <View style={styles.screen}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 126 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.messageList}
        >
          {messages.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: palette.surface2 }]}>
                <Feather name="eye" size={22} color={palette.text} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                Ask Sterling
              </Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>
                Track spending, record income, or ask about your recent activity.
              </Text>
            </View>
          ) : null}

          {messages.map((m) => {
            const isUser = m.role === "user";
            const hasToolSelector = !isUser && m.parts.some((part: any) =>
              part.type?.startsWith("tool-"),
            );

            return (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.assistantRow,
                  hasToolSelector ? styles.fullWidthRow : null,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    hasToolSelector ? styles.toolMessageBubble : null,
                    isUser
                      ? {
                          backgroundColor: palette.userBubble,
                          borderColor: "transparent",
                        }
                      : {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                  ]}
                >
                  {m.parts.map((part: any, index: number) => {
                    const rendered = renderPart(m.id, part, index);
                    if (!rendered) return null;
                    if (isUser && part.type === "text") {
                      return (
                        <Text
                          key={`${m.id}-${index}`}
                          style={[
                            styles.messageText,
                            { color: palette.userText },
                          ]}
                        >
                          {part.text}
                        </Text>
                      );
                    }
                    return rendered;
                  })}
                </View>
              </View>
            );
          })}

          {isGenerating ? (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View
                style={[
                  styles.messageBubble,
                  styles.generatingBubble,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <GeneratingReplyIndicator
                  color={palette.accent}
                  mutedColor={palette.muted}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[
            styles.composerAnchor,
            { paddingBottom: (keyboardInset || insets.bottom) + 10 },
          ]}
        >
          {recognizing && transcript ? (
            <View
              style={[
                styles.transcriptPill,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.transcriptText, { color: palette.muted }]}>
                {transcript}
              </Text>
            </View>
          ) : null}

          <AdaptiveGlass
            colorScheme={colorScheme}
            style={[
              styles.composerGlass,
              {
                backgroundColor:
                  Platform.OS === "ios" ? "transparent" : palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.composerInner}>
              <TextInput
                value={input}
                onChangeText={setInput}
                editable={!recognizing}
                multiline
                placeholder="Message Sterling"
                placeholderTextColor={palette.muted}
                style={[styles.composerInput, { color: palette.text }]}
              />

              <Pressable
                accessibilityLabel={recognizing ? "Stop listening" : "Start voice input"}
                onPress={recognizing ? stopListening : startListening}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: recognizing ? C.danger : palette.surface2,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Feather
                  name={recognizing ? "square" : "mic"}
                  size={18}
                  color={recognizing ? "#FFFFFF" : palette.text}
                />
              </Pressable>

              <Pressable
                accessibilityLabel="Send message"
                disabled={!input.trim()}
                onPress={handleSendMessage}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: input.trim() ? palette.text : palette.disabled,
                    opacity: pressed && input.trim() ? 0.78 : 1,
                  },
                ]}
              >
                <Feather name="arrow-up" size={20} color={C.primaryText} />
              </Pressable>
            </View>
          </AdaptiveGlass>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  emptyTitle: {
    fontFamily: Tokens.font.boldFamily,
    fontSize: 19,
    letterSpacing: 0,
  },
  emptyBody: {
    fontFamily: Tokens.font.family,
    fontSize: 14.5,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
  },
  fullWidthRow: {
    width: "100%",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "86%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolMessageBubble: {
    maxWidth: "100%",
    width: "100%",
  },
  messageText: {
    fontFamily: Tokens.font.family,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 22,
  },
  toolCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginTop: 8,
    padding: 10,
  },
  toolTitle: {
    fontFamily: Tokens.font.semiFamily,
    fontSize: 13.5,
    letterSpacing: 0,
  },
  optionRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  radio: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  radioDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14.5,
    letterSpacing: 0,
    lineHeight: 19,
  },
  inlineInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: Tokens.font.family,
    fontSize: 15,
    letterSpacing: 0,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  confirmButtonText: {
    fontFamily: Tokens.font.semiFamily,
    fontSize: 13.5,
    letterSpacing: 0,
  },
  composerAnchor: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    position: "absolute",
    right: 0,
  },
  transcriptPill: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    maxWidth: "92%",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  transcriptText: {
    fontFamily: Tokens.font.obliqueFamily ?? Tokens.font.family,
    fontSize: 13,
    letterSpacing: 0,
  },
  composerGlass: {
    alignSelf: "stretch",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 58,
    overflow: "hidden",
    padding: 8,
    width: "100%",
  },
  composerInner: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  composerInput: {
    flex: 1,
    fontFamily: Tokens.font.family,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 21,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 10,
    textTransform: "none",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  errorText: {
    fontFamily: Tokens.font.family,
    fontSize: 15,
    lineHeight: 21,
    padding: 20,
  },
  generatingBubble: {
    minWidth: 178,
  },
  generatingContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  generatingDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 18,
  },
  generatingDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  generatingText: {
    fontFamily: Tokens.font.semiFamily,
    fontSize: 13.5,
    letterSpacing: 0,
  },
});
