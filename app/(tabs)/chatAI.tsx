import { useAuthContext } from '@/hooks/use-auth-context';
import { generateAPIUrl } from '@/utils/apiUrlGenerator';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';


export default function ChatAI() {
  const [input, setInput] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { session } = useAuthContext();
  const apiUrl = generateAPIUrl('/api/chat');


  useSpeechRecognitionEvent('result', (event) => {
    setTranscript(event.results[0]?.transcript || '');
  });

  const startListening = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (result.granted) {
      setRecognizing(true);
      setTranscript('');
      ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
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
      setInput('');
      setTranscript('');
    }
  };

  const { messages, error, sendMessage } = useChat({
    
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: apiUrl,
      body: {
        profile_id: session?.user.id,
        token: session?.access_token
      }
    }),
    onError: error => console.error(error, 'ERROR'),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View
        style={{
          height: '95%',
          display: 'flex',
          flexDirection: 'column',
          paddingHorizontal: 8,
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          {messages.map(m => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>{m.role}</Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>


          {/* shows the live transcripts */}
        <View style={{ marginTop: 8, gap: 8 }}>
          {recognizing && transcript && (
            <Text style={{ fontStyle: 'italic', color: '#666' }}>
              Transcript: {transcript}
            </Text>
          )}

          {/* Input field and the controls */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: 'white',
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ddd',
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
                backgroundColor: recognizing ? '#ff6b6b' : '#007AFF',
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {recognizing ? '⏹' : '🎤'}
              </Text>
            </TouchableOpacity>

            {/* send buttn */}
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!input.trim()}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: input.trim() ? '#34C759' : '#ccc',
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}