import { useState, useRef, useEffect, useCallback } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseVoiceInterviewOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  language?: string;
  autoRestart?: boolean;
}

export function useVoiceInterview(options: UseVoiceInterviewOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support and connection quality
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && 'speechSynthesis' in window);

    // Monitor connection quality
    const updateConnectionQuality = () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
      } else if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn.effectiveType === '4g' || conn.effectiveType === 'wifi') {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        setConnectionQuality('good');
      }
    };

    updateConnectionQuality();
    window.addEventListener('online', updateConnectionQuality);
    window.addEventListener('offline', updateConnectionQuality);

    return () => {
      window.removeEventListener('online', updateConnectionQuality);
      window.removeEventListener('offline', updateConnectionQuality);
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.language || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        options.onTranscript(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        options.onTranscript(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        options.onError('No speech detected. Please try again or use text input.');
      } else if (event.error === 'network') {
        options.onError('Network error. Switching to text input recommended.');
        setConnectionQuality('poor');
      } else if (event.error === 'not-allowed') {
        options.onError('Microphone access denied. Please enable microphone permissions.');
      } else {
        options.onError(`Speech recognition error: ${event.error}`);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Auto-restart if enabled and still should be listening
      if (options.autoRestart && isListening) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
            setIsListening(true);
          } catch (err) {
            console.error('Failed to restart recognition:', err);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [options.language, options.autoRestart]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      options.onError('Failed to start voice recognition. Please try text input.');
    }
  }, [isListening, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, [isListening]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      options.onError('Text-to-speech not supported in this browser.');
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set the language for the utterance
    const speechLang = options.language || 'en-US';
    utterance.lang = speechLang;

    // Wait for voices to load
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = speechLang.split('-')[0];
      
      // Find best voice for the selected language
      const preferredVoice = 
        voices.find(v => v.lang === speechLang && v.name.includes('Natural')) ||
        voices.find(v => v.lang === speechLang && v.name.includes('Premium')) ||
        voices.find(v => v.lang === speechLang) ||
        voices.find(v => v.lang.startsWith(langPrefix) && v.name.includes('Natural')) ||
        voices.find(v => v.lang.startsWith(langPrefix) && v.name.includes('Premium')) ||
        voices.find(v => v.lang.startsWith(langPrefix));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      }
    };

    // Voices might not be loaded yet
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoice();
      };
    } else {
      setVoice();
    }

    utterance.onstart = () => setIsSpeaking(true);
    
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [options]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSpeaking,
    isSupported,
    connectionQuality,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
