import { useAuthContext } from "@/hooks/use-auth-context";
import { generateAPIUrl } from "@/utils/apiUrlGenerator";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { fetch as expoFetch } from "expo/fetch";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatAI() {
  const [input, setInput] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [selectedMenuOption, setSelectedMenuOption] = useState<{
    res: any;
  } | null>(null);
  const [sentMenuOptions, setSentMenuOptions] = useState<Set<string>>(
    new Set(),
  );
  const [categoryNameInputs, setCategoryNameInputs] = useState<
    Record<string, string>
  >({});

  const { session } = useAuthContext();
  const apiUrl = generateAPIUrl("/api/chat");

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
    // set transcript to input when stopped
    if (transcript) {
      setInput(transcript);
    }
  };

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
      setTranscript("");
    }
  };

  const { messages, error, sendMessage } = useChat({
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

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 8 }}>
        {messages.map((m) => (
          <View key={m.id} style={{ marginVertical: 8 }}>
            <Text style={{ fontWeight: "700" }}>{m.role}</Text>

            {m.parts.map((part, i) => {
              const menuId = `${m.id}-${i}`;

              const isMenuSent = sentMenuOptions.has(menuId); // check if the menu has been completed

              // Text message
              if (part.type === "text") {
                return <Text key={menuId}>{part.text}</Text>;
              }

              // Tool invocation - Account Selection UI
              if (
                part.type === "tool-getAccountsAndCategoriesForSelection" ||
                part.type === "tool-getAccountsAndIncomeCategoriesForSelection"
              ) {
                // The tool result should have account options
                // Render radio buttons here
                if (part.state === "output-available") {
                  const output = part.output as { accounts?: any[] };

                  return (
                    <View
                      key={menuId}
                      style={{
                        marginVertical: 12,
                        opacity: isMenuSent ? 0.5 : 1, // change the opacity after option has been sent
                      }}
                    >
                      <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                        Select an account:
                      </Text>
                      {output.accounts?.map((res: any) => {
                        const wasOptionSent =
                          isMenuSent &&
                          sentMenuOptions.has(`${menuId}-${res.value}`);

                        return (
                          <TouchableOpacity
                            key={res.id}
                            disabled={isMenuSent} // Disable entire option if menu was sent
                            onPress={() => setSelectedMenuOption({ res })}
                            style={{
                              flexDirection: "row",
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              marginVertical: 4,
                              borderRadius: 8,
                              backgroundColor: wasOptionSent
                                ? "#C8E6C9" // Darker green for sent selection
                                : selectedMenuOption?.res.value === res.value
                                  ? "#E8F5E9" // Light green for current selection
                                  : "#f5f5f5", // Default
                              borderWidth:
                                wasOptionSent ||
                                selectedMenuOption?.res.value === res.value
                                  ? 2
                                  : 1,
                              borderColor: wasOptionSent
                                ? "#2E7D32" // Dark green for sent
                                : selectedMenuOption?.res.value === res.value
                                  ? "#4CAF50" // Green for selected
                                  : "#ddd", // Default
                              opacity: isMenuSent ? 0.7 : 1, // Additional opacity reduction when disabled
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                borderWidth: 2,
                                borderColor: wasOptionSent
                                  ? "#2E7D32"
                                  : selectedMenuOption?.res.value === res.value
                                    ? "#4CAF50"
                                    : "#999",
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 12,
                              }}
                            >
                              {(wasOptionSent ||
                                selectedMenuOption?.res.value ===
                                  res.value) && (
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: wasOptionSent
                                      ? "#2E7D32"
                                      : "#4CAF50",
                                  }}
                                />
                              )}
                            </View>
                            <Text
                              style={{
                                flex: 1,
                                color: isMenuSent ? "#666" : "#000", // Dim text when disabled
                                fontWeight: wasOptionSent ? "600" : "400", // Bold sent selection
                              }}
                            >
                              {res.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Confirm Selection Button */}
                      {selectedMenuOption && !isMenuSent && (
                        <TouchableOpacity
                          onPress={() => {
                            // Send message with selected account
                            sendMessage({
                              text: `I selected ${selectedMenuOption.res.name} account. Please complete the transaction.`,
                            });

                            // Mark this menu and option as sent
                            const newSentOptions = new Set(sentMenuOptions);
                            newSentOptions.add(menuId); // Mark entire menu as sent
                            newSentOptions.add(
                              `${menuId}-${selectedMenuOption.res.value}`,
                            ); // Mark specific option as sent
                            setSentMenuOptions(newSentOptions);

                            setSelectedMenuOption(null);
                          }}
                          style={{
                            marginTop: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            backgroundColor: "#4CAF50",
                            borderRadius: 8,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "white", fontWeight: "600" }}>
                            Confirm Selection
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }
              }

              // Tool Invocation - Category Selection (expense or income)
              if (
                (part.type === "tool-getExpenseCategoriesForSelection" ||
                  part.type === "tool-getIncomeCategoriesForSelection") &&
                part.state === "output-available"
              ) {
                const CREATE_NEW = "__CREATE_NEW__";
                const options = [
                  ...(((part.output as { categories?: any[] })?.categories) ?? []),
                  {
                    id: CREATE_NEW,
                    value: CREATE_NEW,
                    name: CREATE_NEW,
                    label: "+ Create new category",
                  },
                ];
                const isCreateNewSelected =
                  selectedMenuOption?.res.value === CREATE_NEW;
                const newCategoryName = categoryNameInputs[menuId] ?? "";

                return (
                  <View
                    key={menuId}
                    style={{
                      marginVertical: 12,
                      opacity: isMenuSent ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                      Select a category:
                    </Text>
                    {options.map((category: any) => {
                      const wasOptionSent =
                        isMenuSent &&
                        sentMenuOptions.has(`${menuId}-${category.value}`);
                      const isCreateNewRow = category.value === CREATE_NEW;

                      return (
                        <TouchableOpacity
                          key={category.id}
                          disabled={isMenuSent}
                          onPress={() =>
                            setSelectedMenuOption({ res: category })
                          }
                          style={{
                            flexDirection: "row",
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            marginVertical: 4,
                            borderRadius: 8,
                            backgroundColor: wasOptionSent
                              ? "#C8E6C9"
                              : selectedMenuOption?.res.value === category.value
                                ? "#E8F5E9"
                                : "#f5f5f5",
                            borderWidth:
                              wasOptionSent ||
                              selectedMenuOption?.res.value === category.value
                                ? 2
                                : 1,
                            borderColor: wasOptionSent
                              ? "#2E7D32"
                              : selectedMenuOption?.res.value === category.value
                                ? "#4CAF50"
                                : "#ddd",
                            opacity: isMenuSent ? 0.7 : 1,
                          }}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: wasOptionSent
                                ? "#2E7D32"
                                : selectedMenuOption?.res.value ===
                                    category.value
                                  ? "#4CAF50"
                                  : "#999",
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 12,
                            }}
                          >
                            {(wasOptionSent ||
                              selectedMenuOption?.res.value ===
                                category.value) && (
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: wasOptionSent
                                    ? "#2E7D32"
                                    : "#4CAF50",
                                }}
                              />
                            )}
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              color: isMenuSent ? "#666" : "#000",
                              fontWeight: wasOptionSent
                                ? "600"
                                : isCreateNewRow
                                  ? "600"
                                  : "400",
                              fontStyle: isCreateNewRow ? "italic" : "normal",
                            }}
                          >
                            {category.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {isCreateNewSelected && !isMenuSent && (
                      <TextInput
                        value={newCategoryName}
                        onChangeText={(text) =>
                          setCategoryNameInputs((prev) => ({
                            ...prev,
                            [menuId]: text,
                          }))
                        }
                        placeholder="Name the new category (e.g. Food)"
                        style={{
                          marginTop: 8,
                          backgroundColor: "white",
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#ddd",
                        }}
                      />
                    )}

                    {selectedMenuOption && !isMenuSent && (
                      <TouchableOpacity
                        disabled={
                          isCreateNewSelected && !newCategoryName.trim()
                        }
                        onPress={() => {
                          if (isCreateNewSelected) {
                            const name = newCategoryName.trim();
                            if (!name) return;
                            sendMessage({
                              text: `Use the name '${name}' for my new category.`,
                            });
                          } else {
                            sendMessage({
                              text: `I selected ${selectedMenuOption.res.name} category. Please complete the transaction.`,
                            });
                          }

                          const newSentOptions = new Set(sentMenuOptions);
                          newSentOptions.add(menuId);
                          newSentOptions.add(
                            `${menuId}-${selectedMenuOption.res.value}`,
                          );
                          setSentMenuOptions(newSentOptions);

                          setSelectedMenuOption(null);
                        }}
                        style={{
                          marginTop: 12,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor:
                            isCreateNewSelected && !newCategoryName.trim()
                              ? "#aaa"
                              : "#4CAF50",
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "600" }}>
                          {isCreateNewSelected
                            ? "Create and Use"
                            : "Confirm Selection"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }

              // Tool Invocation - New Category Name Prompt (input field)
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
                const currentValue =
                  categoryNameInputs[menuId] ?? suggestion;

                return (
                  <View
                    key={menuId}
                    style={{
                      marginVertical: 12,
                      opacity: isMenuSent ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                      {output?.message ?? "Name your new category:"}
                    </Text>
                    <TextInput
                      value={currentValue}
                      onChangeText={(text) =>
                        setCategoryNameInputs((prev) => ({
                          ...prev,
                          [menuId]: text,
                        }))
                      }
                      placeholder={suggestion}
                      editable={!isMenuSent}
                      style={{
                        backgroundColor: isMenuSent ? "#eee" : "white",
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#ddd",
                        color: isMenuSent ? "#666" : "#000",
                      }}
                    />
                    {!isMenuSent && (
                      <TouchableOpacity
                        onPress={() => {
                          const name = currentValue.trim();
                          if (!name) return;
                          sendMessage({
                            text: `Use the name '${name}' for my new category.`,
                          });
                          const newSentOptions = new Set(sentMenuOptions);
                          newSentOptions.add(menuId);
                          setSentMenuOptions(newSentOptions);
                        }}
                        style={{
                          marginTop: 12,
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: "#4CAF50",
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontWeight: "600" }}>
                          Use this name
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }

              return null;
            })}
          </View>
        ))}
      </ScrollView>

      {/* shows the live transcripts */}
      <View style={{ marginTop: 8, gap: 8 }}>
        {recognizing && transcript && (
          <Text style={{ fontStyle: "italic", color: "#666" }}>
            Transcript: {transcript}
          </Text>
        )}

        {/* Input field and the controls */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: "white",
              padding: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#ddd",
            }}
            placeholder="Say something or type..."
            value={input}
            onChangeText={setInput}
            editable={!recognizing}
          />

          {/* Microphone buttn */}
          <TouchableOpacity
            onPress={recognizing ? stopListening : startListening}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: recognizing ? "#ff6b6b" : "#007AFF",
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {recognizing ? "⏹" : "🎤"}
            </Text>
          </TouchableOpacity>

          {/* send buttn */}
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!input.trim()}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: input.trim() ? "#34C759" : "#ccc",
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
