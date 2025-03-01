class TextToSpeechService {
    constructor() {
      this.synth = window.speechSynthesis;
      this.voices = [];
      this.isReady = false;
      this.playCount = 0;
      
      // Initialize voices
      this.initVoices();
      
      // Set up event listener for voice loading
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = this.initVoices.bind(this);
      }
    }
    
    // Initialize available voices
    initVoices() {
      this.voices = this.synth.getVoices();
      this.isReady = true;
    }
    
    // Get preferred voice (English)
    getPreferredVoice() {
      // First try to get a high-quality English voice
      let voice = this.voices.find(v => 
        (v.lang.includes('en-US') || v.lang.includes('en-GB')) && 
        v.name.includes('Google') // Google voices tend to be better quality
      );
      
      // If no Google voice, try other English voices
      if (!voice) {
        voice = this.voices.find(v => 
          v.lang.includes('en-US') || v.lang.includes('en-GB')
        );
      }
      
      // Fall back to any voice if no English voice is found
      return voice || this.voices[0];
    }
    
    // Speak text with options
    speak(text, options = {}) {
      return new Promise((resolve, reject) => {
        if (!this.synth) {
          reject(new Error('Speech synthesis not supported in this browser'));
          return;
        }
        
        // If synthesis is already speaking, stop it
        if (this.synth.speaking) {
          this.synth.cancel();
        }
        
        // Track play count
        this.playCount++;
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        utterance.voice = options.voice || this.getPreferredVoice();
        
        // Set other options
        utterance.pitch = options.pitch || 1;
        utterance.rate = options.rate || 1;
        utterance.volume = options.volume || 1;
        
        // Event handlers
        utterance.onend = () => {
          resolve({
            success: true,
            playCount: this.playCount
          });
        };
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };
        
        // Start speaking
        this.synth.speak(utterance);
      });
    }
    
    // Pause speech
    pause() {
      if (this.synth) {
        this.synth.pause();
      }
    }
    
    // Resume speech
    resume() {
      if (this.synth) {
        this.synth.resume();
      }
    }
    
    // Cancel speech
    cancel() {
      if (this.synth) {
        this.synth.cancel();
      }
    }
    
    // Check if speech is still playing
    isSpeaking() {
      return this.synth ? this.synth.speaking : false;
    }
    
    // Reset play count
    resetPlayCount() {
      this.playCount = 0;
      return this.playCount;
    }
    
    // Get current play count
    getPlayCount() {
      return this.playCount;
    }
    
    // Check if maximum plays reached (for limiting playback)
    isMaxPlaysReached(maxPlays = 2) {
      return this.playCount >= maxPlays;
    }
  }
  
  // Create singleton instance
  const textToSpeechService = new TextToSpeechService();
  
  export default textToSpeechService;