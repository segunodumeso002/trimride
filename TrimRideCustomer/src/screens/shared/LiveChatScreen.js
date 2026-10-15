import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { apiClient } from '../../services/apiClient';
import { connectSocket } from '../../services/socketClient';
import { useAppMode } from '../../context/AppModeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const CUSTOMER_QUICK_REPLIES = [
  "I'm outside ready! 👍",
  "What color is your car? 🚗",
  "Please park near the gate! 🏠",
  "Need 2 extra minutes! ⏰",
  "Call me when you arrive! 📞",
];

const BARBER_QUICK_REPLIES = [
  "I'm 3 minutes away! ⚡",
  "Just arrived outside! 💈",
  "I have arrived, please come out! ✂️",
  "Stuck in brief traffic, almost there! 🚙",
];

export default function LiveChatScreen({ route, navigation }) {
  const {
    bookingId = 89,
    peerName = 'TrimRide Partner',
    senderType = 'customer',
    service = 'Premium Grooming',
  } = route?.params || {};
  
  const { token, user } = useAppMode();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);

  const myName = user?.email?.split('@')[0] || (senderType === 'customer' ? 'Customer' : 'Barber Driver');
  const quickReplies = senderType === 'customer' ? CUSTOMER_QUICK_REPLIES : BARBER_QUICK_REPLIES;

  useEffect(() => {
    let socket;
    const fetchHistory = async () => {
      try {
        const data = await apiClient.getChatHistory(bookingId);
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (e) {
        console.warn('Could not pull chat history:', e);
      } finally {
        setLoading(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      }
    };

    fetchHistory();

    if (token) {
      socket = connectSocket(token);
      socket.emit('join-booking-room', bookingId);

      const handleNewMessage = (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id || (m.message === newMsg.message && Math.abs(new Date(m.created_at) - new Date(newMsg.created_at)) < 1000))) {
            return prev;
          }
          try {
            Vibration.vibrate([0, 50]);
            ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: true });
          } catch (e) {}
          return [...prev, newMsg];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      };

      socket.on('chat:message:received', handleNewMessage);
      return () => {
        socket.off('chat:message:received', handleNewMessage);
      };
    }
  }, [bookingId, token]);

  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text) return;

    try {
      Vibration.vibrate([0, 40]);
      ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true });
    } catch (e) {}

    const newMsgObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      bookingId: Number(bookingId),
      booking_id: Number(bookingId),
      sender_type: senderType,
      sender_name: myName,
      message: text,
      created_at: new Date().toISOString(),
    };

    // Instant optimistic UI rendering
    setMessages((prev) => [...prev, newMsgObj]);
    if (typeof textToSend !== 'string') setInputText('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);

    try {
      if (token) {
        const socket = connectSocket(token);
        socket.emit('chat:message', newMsgObj);
      }
      await apiClient.sendChatMessage({
        bookingId,
        senderType,
        senderName: myName,
        message: text,
      });
    } catch (error) {
      console.warn('Chat send network fallback:', error.message);
    }
  };

  const handleCallPeer = () => {
    try {
      Vibration.vibrate([0, 150, 50, 150]);
      ReactNativeHapticFeedback.trigger('impactHeavy', { enableVibrateFallback: true });
    } catch (e) {}
    Linking.openURL('tel:0800874674').catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 85 : 0}
    >
      <View style={styles.headerBar}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.peerName}>💬 {peerName}</Text>
          <Text style={styles.peerSubtitle}>Live Dispatch Chat • {service}</Text>
        </View>
        <TouchableOpacity style={styles.callButton} onPress={handleCallPeer}>
          <Text style={styles.callButtonText}>📞 DIRECT CALL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
      >
        {messages.map((msg, index) => {
          const isMe = msg.sender_type === senderType;
          const isSystem = msg.sender_type === 'system';

          if (isSystem) {
            return (
              <View key={index} style={styles.systemBubble}>
                <Text style={styles.systemText}>{msg.message}</Text>
              </View>
            );
          }

          return (
            <View
              key={index}
              style={[
                styles.bubbleWrapper,
                isMe ? styles.myBubbleWrapper : styles.peerBubbleWrapper,
              ]}
            >
              <Text style={styles.senderLabel}>{isMe ? 'You' : msg.sender_name || peerName}</Text>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.peerBubble]}>
                <Text style={[styles.bubbleText, isMe ? styles.myBubbleText : styles.peerBubbleText]}>
                  {msg.message}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.quickReplyContainer}>
        <Text style={styles.quickReplyTitle}>⚡ Quick 1-Tap En-Route Replies:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyScroll}>
          {quickReplies.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickReplyPill}
              onPress={() => handleSendMessage(reply)}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder={`Type a message to ${peerName}...`}
          placeholderTextColor={colors.steel}
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="send"
          onSubmitEditing={() => handleSendMessage(inputText)}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSendMessage(inputText)}>
          <Text style={styles.sendButtonText}>Send 🚀</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  headerBar: {
    backgroundColor: '#0F1F35',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleContainer: { flex: 1, paddingRight: spacing.sm },
  peerName: { color: colors.white, fontSize: 18, fontWeight: '800' },
  peerSubtitle: { color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
  callButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  callButtonText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  messageList: { flex: 1, backgroundColor: '#F8FAFC' },
  messageListContent: { padding: spacing.md, paddingBottom: spacing.lg },
  systemBubble: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    alignSelf: 'center',
    maxWidth: '92%',
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
  },
  systemText: { color: colors.charcoal, fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  bubbleWrapper: { marginVertical: 6, maxWidth: '82%' },
  myBubbleWrapper: { alignSelf: 'flex-end' },
  peerBubbleWrapper: { alignSelf: 'flex-start' },
  senderLabel: { fontSize: 11, fontWeight: '700', color: colors.steel, marginBottom: 2, marginHorizontal: 4 },
  bubble: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  myBubble: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  peerBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#CBD5E1', borderBottomLeftRadius: 4 },
  myBubbleText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  peerBubbleText: { color: colors.charcoal, fontSize: 15, fontWeight: '600' },
  quickReplyContainer: {
    backgroundColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  quickReplyTitle: { fontSize: 12, fontWeight: '800', color: colors.charcoal, paddingHorizontal: spacing.md, marginBottom: 6 },
  quickReplyScroll: { paddingHorizontal: spacing.md, gap: 8 },
  quickReplyPill: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickReplyText: { color: '#1D4ED8', fontSize: 13, fontWeight: '800' },
  inputBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.charcoal,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginLeft: 10,
  },
  sendButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
