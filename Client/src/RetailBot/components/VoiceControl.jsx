import React, { useState, useEffect, useRef } from 'react';
import './VoiceControl.css';
// import '../common.css';



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
    <div className="voiceControl-container">
      <div className="voiceControl-input-wrapper voiceControl-flex voiceControl-items-center voiceControl-w-full">
        <input
          type="text"
          ref={inputRef}
          className="voiceControl-input voiceControl-flex-1 voiceControl-p-2 voiceControl-border voiceControl-border-gray voiceControl-rounded-l"
          placeholder="Type your response..."
          value={textInput}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          disabled={disabled || speaking}
        />
        <button 
          className="voiceControl-button voiceControl-px-4 voiceControl-py-2 voiceControl-bg-blue voiceControl-text-white voiceControl-rounded-r voiceControl-hover-bg-blue voiceControl-disabled-bg-gray"
          onClick={handleSend}
          disabled={disabled || speaking || !textInput.trim()}
        >
          <span className="voiceControl-flex voiceControl-items-center">
            Send
            <svg 
              className="voiceControl-ml-3" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </span>
        </button>
      </div>
      
      <div className="voiceControl-flex voiceControl-items-center voiceControl-justify-center voiceControl-mt-3">
        {micAvailable && (
          <>
            <button 
              className={`voiceControl-mic-button ${isListening ? 'active' : ''} ${speaking || disabled ? 'disabled' : ''}`}
              onClick={toggleListening}
              disabled={speaking || disabled}
              title={isListening ? "Click to stop listening" : "Click to start listening"}
            >
              {isListening ? (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                </svg>
              ) : (
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                </svg>
              )}
            </button>
            
            {isListening && (
              <div className="voiceControl-status voiceControl-ml-3">
                <span className="voiceControl-flex voiceControl-items-center">
                  <svg 
                    className="voiceControl-mr-2" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Listening... (speak and click Send when done)
                </span>
              </div>
            )}
          </>
        )}
        
        {!micAvailable && (
          <div className="voiceControl-unavailable voiceControl-text-yellow">
            <span className="voiceControl-flex voiceControl-items-center">
              <svg 
                className="voiceControl-mr-2" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Microphone not available in this browser. Please use text input.
            </span>
          </div>
        )}
        
        {speaking && (
          <div className="voiceControl-status voiceControl-ml-3">
            <span className="voiceControl-flex voiceControl-items-center">
              <svg 
                className="voiceControl-mr-2" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
              </svg>
              Customer speaking...
            </span>
          </div>
        )}
      </div>
      
      {transcript && isListening && (
        <div className="voiceControl-transcript voiceControl-mt-2 voiceControl-text-center voiceControl-p-2 voiceControl-bg-gray">
          <div className="voiceControl-text-sm voiceControl-text-gray voiceControl-mb-1">
            <span className="voiceControl-flex voiceControl-items-center voiceControl-justify-center">
              <svg 
                className="voiceControl-mr-2" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Detected speech:
            </span>
          </div>
          {transcript}
        </div>
      )}
    </div>
  );
}

export default VoiceControl;