// ════════════════════════════════════════════════════════════════
// DharmaSetu — Voice Input Modal (P4 upgrade)
// FILE: app/components/VoiceInputModal.js
//
// P4 upgrades:
//  - voiceStatus prop: shows recording / processing live states
//  - Animated red pulse ring when recording is active
//  - "Stop & Transcribe" button appears while recording
//  - Still provides text fallback for when mic is unavailable
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Modal,
  Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { VoiceStatus } from '../utils/voiceInput';

/**
 * @param {object}   props
 * @param {boolean}  props.visible      - controls modal visibility
 * @param {string}   props.lang         - 'hindi' | 'english'
 * @param {string}   props.voiceStatus  - VoiceStatus enum value
 * @param {Function} props.onSubmit     - called with (text: string)
 * @param {Function} props.onClose      - called when dismissed
 * @param {Function} props.onStopVoice  - called when user taps Stop recording
 */
export default function VoiceInputModal({
  visible,
  lang = 'hindi',
  voiceStatus = VoiceStatus.IDLE,
  onSubmit,
  onClose,
  onStopVoice,
}) {
  const [text,     setText]    = useState('');
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef  = useRef(null);
  const isH = lang === 'hindi';

  const isRecording  = voiceStatus === VoiceStatus.RECORDING;
  const isProcessing = voiceStatus === VoiceStatus.PROCESSING;
  const isActive     = isRecording || isProcessing;

  // Slide-up animation
  useEffect(() => {
    if (visible) {
      setText('');
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        friction: 9, tension: 120,
      }).start(() => {
        if (!isActive) setTimeout(() => inputRef.current?.focus(), 80);
      });
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, {
        toValue: 300, duration: 200, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Pulse ring while recording
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.00, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onSubmit?.(trimmed);
    setText('');
    onClose?.();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setText('');
    onClose?.();
  };

  const statusLabel = () => {
    if (isRecording)  return isH ? '🔴 सुन रहा हूँ... — रोकने के लिए टैप करें' : '🔴 Listening... — tap to stop';
    if (isProcessing) return isH ? '⏳ समझ रहा हूँ...' : '⏳ Processing voice...';
    if (voiceStatus === VoiceStatus.DONE)  return isH ? '✅ पहचान हुई — नीचे जाँचें' : '✅ Recognized — check below';
    if (voiceStatus === VoiceStatus.ERROR) return isH ? '❌ नहीं सुन पाया — टाइप करें' : '❌ Not heard — please type';
    return isH ? 'अपना प्रश्न लिखें या बोलें' : 'Type or speak your question';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>

      {/* Dim backdrop — tap to dismiss */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kavWrapper}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle bar */}
          <View style={s.handle} />

          {/* Title row */}
          <View style={s.titleRow}>
            {/* P4: animated mic icon while recording */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              {isRecording ? (
                <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={{ fontSize: 20 }}>🎤</Text>
                </Animated.View>
              ) : (
                <Text style={s.titleIco}>🎤</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{statusLabel()}</Text>
              <Text style={s.sub}>
                {isH
                  ? 'DharmaChat को पूछें — शास्त्र, ज्योतिष, जीवन'
                  : 'Ask DharmaChat — scripture, jyotish, life guidance'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* P4: Stop recording button (shown while recording) */}
          {isActive && (
            <TouchableOpacity
              style={s.stopBtn}
              onPress={onStopVoice}
              activeOpacity={0.82}
              disabled={isProcessing}>
              <Text style={s.stopBtnTxt}>
                {isProcessing
                  ? (isH ? '⏳ Processing...' : '⏳ Processing...')
                  : (isH ? '⏹ रोकें और भेजें' : '⏹ Stop & Send')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Text input fallback (hidden while actively recording) */}
          {!isActive && (
            <>
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder={isH
                  ? 'यहाँ अपना प्रश्न लिखें...'
                  : 'Type your question here...'}
                placeholderTextColor="rgba(253,246,237,0.28)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                blurOnSubmit={false}
                autoCorrect={false}
                autoCapitalize="sentences"
              />
              <Text style={s.charCount}>{text.length}/500</Text>

              {/* Quick suggestions */}
              <View style={s.quickRow}>
                {(isH ? [
                  'मेरी राशि का भविष्य बताएं',
                  'गीता का कर्म योग समझाएं',
                  'आज का शुभ समय',
                ] : [
                  'Explain Karma Yoga',
                  'Today\'s auspicious time',
                  'My Rashi guidance',
                ]).map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.quickChip}
                    onPress={() => { setText(q); inputRef.current?.focus(); }}
                    activeOpacity={0.75}>
                    <Text style={s.quickChipTxt} numberOfLines={1}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[s.sendBtn, !text.trim() && s.sendBtnOff]}
                onPress={handleSubmit}
                disabled={!text.trim()}
                activeOpacity={0.85}>
                <Text style={s.sendBtnTxt}>
                  {isH ? 'पूछें 🙏' : 'Ask 🙏'}
                </Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  kavWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#160800',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(240,165,0,0.15)',
  },
  handle:   { width:36, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.15)', alignSelf:'center', marginBottom:16 },
  titleRow: { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:14 },
  titleIco: { fontSize:22, marginTop:2 },
  title:    { fontSize:15, fontWeight:'800', color:'#F4A261', marginBottom:3 },
  sub:      { fontSize:11, color:'rgba(253,246,237,0.38)', lineHeight:16 },
  closeBtn: { padding:4 },
  closeTxt: { fontSize:16, color:'rgba(253,246,237,0.4)', fontWeight:'600' },

  // P4: pulse ring for live recording
  pulseRing: {
    width:36, height:36, borderRadius:18,
    backgroundColor:'rgba(232,50,50,0.18)',
    borderWidth:2, borderColor:'#E83232',
    alignItems:'center', justifyContent:'center',
  },

  // P4: Stop button
  stopBtn: {
    backgroundColor:'rgba(232,50,50,0.15)',
    borderRadius:14, paddingVertical:14,
    alignItems:'center', marginBottom:16,
    borderWidth:1, borderColor:'rgba(232,50,50,0.4)',
  },
  stopBtnTxt: { color:'#FF6B6B', fontSize:15, fontWeight:'800' },

  input: {
    backgroundColor:'rgba(255,255,255,0.06)',
    borderRadius:16, paddingHorizontal:16, paddingVertical:13,
    color:'#FDF6ED', fontSize:15, minHeight:80, maxHeight:140,
    borderWidth:1, borderColor:'rgba(200,130,40,0.25)',
    lineHeight:24, textAlignVertical:'top',
  },
  charCount:    { fontSize:10, color:'rgba(253,246,237,0.2)', textAlign:'right', marginTop:5, marginBottom:12 },
  quickRow:     { flexDirection:'row', flexWrap:'wrap', gap:7, marginBottom:16 },
  quickChip:    { backgroundColor:'rgba(232,98,10,0.1)', borderRadius:20, paddingHorizontal:12, paddingVertical:7, borderWidth:1, borderColor:'rgba(232,98,10,0.25)', maxWidth:'100%' },
  quickChipTxt: { fontSize:11, color:'#F4A261', fontWeight:'500' },
  sendBtn:      { backgroundColor:'#E8620A', borderRadius:14, paddingVertical:14, alignItems:'center', elevation:4, shadowColor:'#E8620A', shadowOffset:{width:0,height:3}, shadowOpacity:0.4, shadowRadius:6 },
  sendBtnOff:   { backgroundColor:'rgba(232,98,10,0.25)', elevation:0, shadowOpacity:0 },
  sendBtnTxt:   { color:'#fff', fontSize:16, fontWeight:'800' },
});



