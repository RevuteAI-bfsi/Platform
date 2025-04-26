export const initializeSpeechRecognition = (recognitionRef, transcriptBufferRef, setTranscript, isRecording, stopRecording) => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;

      if (
        "speechGrammarList" in window ||
        "webkitSpeechGrammarList" in window
      ) {
        const SpeechGrammarList =
          window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammar = "#JSGF V1.0;";
        const speechGrammarList = new SpeechGrammarList();
        speechGrammarList.addFromString(grammar, 1);
        recognitionRef.current.grammars = speechGrammarList;
      }

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscriptSegment = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscriptSegment += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscriptSegment) {
          transcriptBufferRef.current += " " + finalTranscriptSegment;
          setTranscript(transcriptBufferRef.current.trim());
        } else if (interimTranscript) {
          setTranscript(transcriptBufferRef.current + " " + interimTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          stopRecording();
        }
      };
    } else {
      alert(
        "Speech recognition is not supported in your browser. Please try Chrome or Edge."
      );
    }
  };

export const startRecording = (
  recognitionRef,
  transcriptBufferRef,
  setTranscript,
  setIsRecording,
  setTimeRemaining,
  setTimerActive,
  timerIntervalRef,
  setAutoSubmitted,
  stopRecording,
  setAccuracy,
  setFeedback,
  setDetailedScore,
  setShowAIAnalysis,
  clearAnalysis,
  setRecordingStartTime
) => {
  if (recognitionRef.current) {
    setTranscript("");
    transcriptBufferRef.current = "";
    setAccuracy(null);
    setFeedback(null);
    setDetailedScore(null);
    setShowAIAnalysis(false);
    clearAnalysis();

    setRecordingStartTime(Date.now());

    setTimeRemaining(150);
    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prevTime) => {
        if (prevTime <= 1) {
          setAutoSubmitted(true);
          clearInterval(timerIntervalRef.current);
          stopRecording();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    setIsRecording(true);
    recognitionRef.current.start();
  } else {
    alert(
      "Speech recognition is not supported in your browser. Please try Chrome or Edge."
    );
  }
};

export const stopRecording = (
  recognitionRef,
  isRecording,
  setIsRecording,
  timerIntervalRef,
  setTimerActive,
  timeRemaining,
  transcriptBufferRef,
  transcript,
  setTranscript,
  selectedPassage,
  calculateDetailedScore,
  setFeedback,
  setAccuracy
) => {
  if (recognitionRef.current && isRecording) {
    recognitionRef.current.onend = null;
    recognitionRef.current.stop();
    setIsRecording(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      setTimerActive(false);
    }

    const delayMs = timeRemaining <= 0 ? 1000 : 500;

    setTimeout(() => {
      const finalText = transcriptBufferRef.current.trim() || transcript.trim();

      if (selectedPassage && finalText) {
        if (finalText !== transcript) {
          setTranscript(finalText);
        }
        calculateDetailedScore();
      } else {
        setFeedback("No readable content was detected. Please try again and speak clearly.");
        setAccuracy(0);
      }
    }, delayMs);
  }
};