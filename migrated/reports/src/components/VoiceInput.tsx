import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VoiceInputProps {
    onRecordingComplete: (uri: string, duration: number) => void;
    onSendPress?: () => void;
    hasText?: boolean;
    sending?: boolean;
    accentColor?: string;
    onTranscription?: (text: string) => void;
    enableTranscription?: boolean;
}

export default function VoiceInput({
    onRecordingComplete,
    onSendPress,
    hasText = false,
    sending = false,
    accentColor = '#6366f1',
    onTranscription,
    enableTranscription = false,
}: VoiceInputProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isDictating, setIsDictating] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recognitionRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const recordBarAnim = useRef(new Animated.Value(0)).current;
    const dotOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            try {
                if (recognitionRef.current) {
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.onend = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.stop();
                }
            } catch {
                // noop
            }
        };
    }, []);

    const handleStartRecording = useCallback(async () => {
        if (hasText) return;
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: rec } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(rec);
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();

            Animated.spring(recordBarAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(dotOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                    Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } catch (err) {
            console.error('[VoiceInput] Failed to start recording', err);
        }
    }, [hasText, pulseAnim, recordBarAnim, dotOpacity]);

    const handleStopRecording = useCallback(async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const currentRecording = recording;
        setRecording(null);
        setIsRecording(false);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        dotOpacity.stopAnimation();
        dotOpacity.setValue(1);
        Animated.timing(recordBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        if (!currentRecording) return;

        try {
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();
            if (uri && duration >= 1) {
                // If transcription is enabled on native, transcribe via Gemini
                if (enableTranscription && onTranscription && Platform.OS !== 'web') {
                    setIsTranscribing(true);
                    try {
                        const { transcribeAudio } = await import('../../src/lib/gemini_client');
                        const text = await transcribeAudio(uri);
                        if (text.trim()) {
                            onTranscription(text.trim());
                        }
                    } catch (err) {
                        console.warn('[VoiceInput] Transcription failed:', err);
                    } finally {
                        setIsTranscribing(false);
                    }
                } else {
                    onRecordingComplete(uri, duration);
                }
            }
        } catch (error) {
            console.error('[VoiceInput] Failed to stop recording', error);
        }
    }, [recording, duration, onRecordingComplete, enableTranscription, onTranscription, pulseAnim, recordBarAnim, dotOpacity]);

    const handleCancelRecording = useCallback(async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const currentRecording = recording;
        setRecording(null);
        setIsRecording(false);
        setDuration(0);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        dotOpacity.stopAnimation();
        dotOpacity.setValue(1);
        Animated.timing(recordBarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        if (!currentRecording) return;
        try {
            await currentRecording.stopAndUnloadAsync();
        } catch {
            // noop
        }
    }, [recording, pulseAnim, recordBarAnim, dotOpacity]);

    const handleStartDictation = useCallback(() => {
        if (!enableTranscription || !onTranscription || Platform.OS !== 'web') return false;
        if (typeof window === 'undefined') return false;

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return false;

        try {
            const recognition = new SR();
            recognitionRef.current = recognition;
            recognition.lang = ((globalThis as any).navigator?.language as string) || 'ru-RU';
            recognition.interimResults = true;
            recognition.continuous = false;
            recognition.maxAlternatives = 1;

            let finalText = '';

            recognition.onstart = () => setIsDictating(true);
            recognition.onresult = (event: any) => {
                let chunk = '';
                for (let i = event.resultIndex; i < event.results.length; i += 1) {
                    chunk += event.results[i][0]?.transcript || '';
                }
                if (chunk.trim()) finalText = chunk.trim();
            };
            recognition.onerror = (err: any) => {
                console.warn('[VoiceInput] Dictation error:', err?.error || err);
            };
            recognition.onend = () => {
                setIsDictating(false);
                const text = finalText.trim();
                if (text) onTranscription(text);
            };

            recognition.start();
            return true;
        } catch (err) {
            console.error('[VoiceInput] Failed to start dictation', err);
            setIsDictating(false);
            return false;
        }
    }, [enableTranscription, onTranscription]);

    const handleStopDictation = useCallback(() => {
        try {
            if (recognitionRef.current) recognitionRef.current.stop();
        } catch {
            // noop
        } finally {
            setIsDictating(false);
        }
    }, []);

    const formatDuration = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleButtonPress = () => {
        if (hasText && onSendPress) {
            onSendPress();
            return;
        }

        if (sending || isTranscribing) return;

        if (enableTranscription && Platform.OS === 'web') {
            if (isDictating) {
                handleStopDictation();
            } else {
                const started = handleStartDictation();
                if (!started) {
                    if (isRecording) {
                        void handleStopRecording();
                    } else {
                        void handleStartRecording();
                    }
                }
            }
            return;
        }

        // Native: toggle recording for transcription
        if (isRecording) {
            void handleStopRecording();
        } else {
            void handleStartRecording();
        }
    };

    if (isRecording) {
        return (
            <View style={s.recordingBar}>
                <Pressable onPress={handleCancelRecording} style={s.cancelBtn}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>

                <View style={s.recordingInfo}>
                    <Animated.View style={[s.redDot, { opacity: dotOpacity }]} />
                    <Text style={s.durationText}>{formatDuration(duration)}</Text>
                </View>

                <Text style={s.slideHint}>Release to send</Text>

                <Pressable onPress={handleStopRecording} style={s.stopBtn}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <View style={[s.mainBtn, s.mainBtnRecording]}>
                            <Ionicons name="send" size={20} color="#fff" />
                        </View>
                    </Animated.View>
                </Pressable>
            </View>
        );
    }

    return (
        <Pressable
            onPress={handleButtonPress}
            onLongPress={!hasText && !enableTranscription ? handleStartRecording : undefined}
            delayLongPress={200}
            disabled={sending || isTranscribing}
            style={({ pressed }) => [
                s.mainBtn,
                { backgroundColor: hasText ? accentColor : (isDictating || isRecording ? '#ef4444' : isTranscribing ? '#f59e0b' : '#f1f5f9') },
                pressed && { opacity: 0.7 },
                (sending || isTranscribing) && { opacity: 0.5 },
            ]}
            accessibilityLabel={hasText ? 'Send message' : isTranscribing ? 'Transcribing' : 'Voice input'}
            accessibilityRole="button"
        >
            {sending ? (
                <Text style={{ color: hasText ? '#fff' : '#64748b', fontSize: 16 }}>...</Text>
            ) : isTranscribing ? (
                <Ionicons name="hourglass" size={20} color="#fff" />
            ) : hasText ? (
                <Ionicons name="send" size={20} color="#fff" />
            ) : isDictating || isRecording ? (
                <Ionicons name="mic" size={22} color="#fff" />
            ) : (
                <Ionicons name="mic" size={22} color="#64748b" />
            )}
        </Pressable>
    );
}

const s = StyleSheet.create({
    mainBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainBtnRecording: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    cancelBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fef2f2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    durationText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        fontVariant: ['tabular-nums'],
    },
    slideHint: {
        flex: 1,
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
    },
    stopBtn: {},
});