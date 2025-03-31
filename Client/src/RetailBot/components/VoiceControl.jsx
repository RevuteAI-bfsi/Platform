import React, { useState, useEffect, useRef } from 'react';
import './VoiceControl.css';

function VoiceControl({ onMessage, speaking, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [micAvailable, setMicAvailable] = useState(true);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      setMicAvailable(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      const current = event.results.length - 1;
      const transcript = event.results[current][0].transcript;
      console.log('Transcript:', transcript);
      setTranscript(transcript);
      setTextInput(transcript);
    };
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
        }
      }
    };
  }, []);
  
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening && !speaking && !disabled) {
      try {
        recognition.start();
        console.log('Attempting to start recognition');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        if (error.message.includes('already started')) {
          recognition.stop();
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }, 100);
        }
      }
    } else if (!isListening && recognition) {
      try {
        recognition.stop();
        console.log('Stopping recognition');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [isListening, speaking, disabled]);
  
  const toggleListening = () => {
    if (speaking || disabled || !micAvailable) return;
    if (isListening) {
      stopListening();
    } else {
      setIsListening(true);
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    setIsListening(false);
  };
  
  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };
  
  const handleSend = () => {
    if (textInput.trim() && !disabled && !speaking) {
      if (isListening) {
        stopListening();
      }
      onMessage(textInput);
      setTextInput('');
      setTranscript('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="voicecontrol-voice-controls">
      <div className="voicecontrol-input-container voicecontrol-flex voicecontrol-items-center voicecontrol-w-full">
        <input
          type="text"
          ref={inputRef}
          className="voicecontrol-input-text voicecontrol-flex-1 voicecontrol-p-2 voicecontrol-border voicecontrol-border-gray-300 voicecontrol-rounded-l-lg"
          placeholder="Type your response..."
          value={textInput}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || speaking}
        />
        <button 
          className="voicecontrol-button voicecontrol-px-4 voicecontrol-py-2 voicecontrol-bg-blue-700 voicecontrol-text-white voicecontrol-rounded-r-lg voicecontrol-hover:bg-blue-800 voicecontrol-disabled:bg-gray-400"
          onClick={handleSend}
          disabled={disabled || speaking || !textInput.trim()}
        >
          Send
        </button>
      </div>
      <div className="voicecontrol-flex voicecontrol-items-center voicecontrol-justify-center voicecontrol-mt-3">
        {micAvailable && (
          <>
            <button 
              className={`voicecontrol-mic-button ${isListening ? 'voicecontrol-active' : ''} ${speaking || disabled ? 'voicecontrol-disabled' : ''}`}
              onClick={toggleListening}
              disabled={speaking || disabled}
              title={isListening ? "Click to stop listening" : "Click to start listening"}
            >
              {isListening ? '🎤' : '🎙️'}
            </button>
            {isListening && (
              <div className="voicecontrol-listening-indicator voicecontrol-ml-3">
                Listening... (speak and click Send when done)
              </div>
            )}
          </>
        )}
        {!micAvailable && (
          <div className="voicecontrol-mic-unavailable voicecontrol-text-yellow-600">
            Microphone not available in this browser. Please use text input.
          </div>
        )}
        {speaking && (
          <div className="voicecontrol-speaking-indicator voicecontrol-ml-3">
            Customer speaking...
          </div>
        )}
      </div>
      {transcript && isListening && (
        <div className="voicecontrol-transcript voicecontrol-mt-2 voicecontrol-text-center voicecontrol-p-2 voicecontrol-bg-gray-100 voicecontrol-rounded">
          <div className="voicecontrol-text-sm voicecontrol-text-gray-500 voicecontrol-mb-1">
            Detected speech:
          </div>
          {transcript}
        </div>
      )}
    </div>
  );
}

export default VoiceControl;
