// src/hooks/useGeminiAnalysis.js
import { useState } from 'react';
import geminiService from '../services/Geminiservice';

/**
 * Custom hook for using Google Gemini API for enhanced analysis
 */
const useGeminiAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Analyze reading practice
   */
  const analyzeReading = async (originalText, userTranscript) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await geminiService.analyzeReadingTranscript(originalText, userTranscript);
      
      if (result.error) {
        throw new Error(result.message);
      }
      
      setAnalysis(result);
      return result;
    } catch (err) {
      console.error('Error analyzing reading:', err);
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Analyze listening & writing practice
   */
  const analyzeListening = async (originalTranscript, userAnswer) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await geminiService.analyzeListeningResponse(originalTranscript, userAnswer);
      
      if (result.error) {
        throw new Error(result.message);
      }
      
      setAnalysis(result);
      return result;
    } catch (err) {
      console.error('Error analyzing listening response:', err);
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Analyze speaking practice
   */
  const analyzeSpeaking = async (topic, prompt, userTranscript) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await geminiService.analyzeSpeakingResponse(topic, prompt, userTranscript);
      
      if (result.error) {
        throw new Error(result.message);
      }
      
      setAnalysis(result);
      return result;
    } catch (err) {
      console.error('Error analyzing speaking response:', err);
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Clear analysis results
   */
  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };
  
  return {
    analysis,
    isAnalyzing,
    error,
    analyzeReading,
    analyzeListening,
    analyzeSpeaking,
    clearAnalysis
  };
};

export default useGeminiAnalysis;