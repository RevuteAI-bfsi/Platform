import React, { useState, useEffect, useRef } from 'react';
import './VoiceControl.css';
import '../common.css';



// Component for handling voice input/output
function VoiceControl({ onMessage, speaking, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [micAvailable, setMicAvailable] = useState(true);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const inputRef = useRef(null);
  
  // Initialize speech recognition when component mounts
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      setMicAvailable(false);
      return;
    }
    
    // Use the appropriate speech recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = true; // Changed to true for better recognition
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };
    
    recognition.onresult = (event) => {
      const current = event.results.length - 1;
      const transcript = event.results[current][0].transcript;
      console.log('Transcript:', transcript); // Debug log
      setTranscript(transcript);
      setTextInput(transcript); // Also update text input field
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);
  
  // Start/stop listening based on isListening state
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    
    if (isListening && !speaking && !disabled) {
      try {
        recognition.start();
        console.log('Attempting to start recognition');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        // If already started, stop and restart
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
  
  // Toggle listening state
  const toggleListening = () => {
    if (speaking || disabled || !micAvailable) return;
    
    // If already listening, stop and clear transcript
    if (isListening) {
      stopListening();
    } else {
      // Start listening
      setIsListening(true);
    }
  };
  
  // Function to stop listening
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
  
  // Handle text input change
  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };
  
  // Handle manual send button click
  const handleSend = () => {
    if (textInput.trim() && !disabled && !speaking) {
      // Stop listening if active
      if (isListening) {
        stopListening();
      }
      
      // Send the message
      onMessage(textInput);
      
      // Clear input and transcript
      setTextInput('');
      setTranscript('');
      
      // Focus back on input field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="voice-controls">
      <div className="input-container flex items-center w-full">
        <input
          type="text"
          ref={inputRef}
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your response..."
          value={textInput}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || speaking}
        />
        <button 
          className="px-4 py-2 bg-blue-700 text-white rounded-r-lg hover:bg-blue-800 disabled:bg-gray-400"
          onClick={handleSend}
          disabled={disabled || speaking || !textInput.trim()}
        >
          Send
        </button>
      </div>
      
      <div className="flex items-center justify-center mt-3">
        {micAvailable && (
          <>
            <button 
              className={`mic-button ${isListening ? 'active' : ''} ${speaking || disabled ? 'disabled' : ''}`}
              onClick={toggleListening}
              disabled={speaking || disabled}
              title={isListening ? "Click to stop listening" : "Click to start listening"}
            >
              {isListening ? '🎤' : '🎙️'}
            </button>
            
            {isListening && (
              <div className="listening-indicator ml-3">Listening... (speak and click Send when done)</div>
            )}
          </>
        )}
        
        {!micAvailable && (
          <div className="mic-unavailable text-yellow-600">
            Microphone not available in this browser. Please use text input.
          </div>
        )}
        
        {speaking && (
          <div className="speaking-indicator ml-3">Customer speaking...</div>
        )}
      </div>
      
      {transcript && isListening && (
        <div className="transcript mt-2 text-center p-2 bg-gray-100 rounded">
          <div className="text-sm text-gray-500 mb-1">Detected speech:</div>
          {transcript}
        </div>
      )}
    </div>
  );
}

export default VoiceControl;