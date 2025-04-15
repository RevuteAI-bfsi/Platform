class GeminiService {
    constructor() {
      // Replace with your Gemini API key
      this.apiKey = 'AIzaSyAeKDFy9EGSQ5m9OlIjP33adzG1ZF-O-xg';
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }
    
    // Analyze reading transcript and provide feedback
    async analyzeReadingTranscript(originalText, userTranscript) {
      const prompt = {
        contents: [
          {
            parts: [
              {
                text: `Analyze the following reading exercise. Compare the original text with the user's reading transcript and provide detailed feedback.
                  
                  Original Text:
                  "${originalText}"
                  
                  User's Transcript:
                  "${userTranscript}"
                  
                  Please provide:
                  1. Analysis of accuracy (word-by-word matching)
                  2. Identification of mispronounced or missed words
                  3. Analysis of proper pauses at punctuation (if detectable)
                  4. Overall reading fluency assessment
                  5. A score out of 10 for the reading
                  6. Specific tips for improvement
                  
                  Format your response as JSON with the following fields:
                  - accuracyScore (number 0-5)
                  - fluencyScore (number 0-2)
                  - pauseScore (number 0-1)
                  - expressionScore (number 0-2)
                  - overallScore (number 0-10)
                  - mispronunciations (array of strings)
                  - missedWords (array of strings)
                  - feedback (string with overall assessment)
                  - improvementTips (array of strings)
                  
                  Keep the response under 300 words.`
              }
            ]
          }
        ]
      };
      
      return this.callGeminiAPI(prompt);
    }
    
    // Analyze listening & writing response and provide feedback
    async analyzeListeningResponse(originalTranscript, userAnswer) {
      const prompt = {
        contents: [
          {
            parts: [
              {
                text: `Analyze the following listening comprehension exercise. Compare the original transcript with the user's written response and provide detailed feedback.
                  
                  Original Transcript:
                  "${originalTranscript}"
                  
                  User's Response:
                  "${userAnswer}"
                  
                  Please provide:
                  1. Analysis of content accuracy (key points captured)
                  2. Assessment of spelling and grammar
                  3. Evaluation of proper punctuation usage
                  4. Overall comprehension assessment
                  5. A score out of 10 for the response
                  6. Specific tips for improvement
                  
                  Format your response as JSON with the following fields:
                  - contentScore (number 0-5)
                  - spellingScore (number 0-3)
                  - punctuationScore (number 0-2)
                  - overallScore (number 0-10)
                  - missedKeyPoints (array of strings)
                  - spellingErrors (array of strings)
                  - feedback (string with overall assessment)
                  - improvementTips (array of strings)
                  
                  Keep the response under 300 words.`
              }
            ]
          }
        ]
      };
      
      return this.callGeminiAPI(prompt);
    }
    
    // Analyze speaking response and provide feedback
    async analyzeSpeakingResponse(topic, prompt, userTranscript) {
      const promptText = {
        contents: [
          {
            parts: [
              {
                text: `Analyze the following speaking exercise response. Evaluate the user's spoken response to the given topic and prompt, and provide detailed feedback.
                  
                  Topic: "${topic}"
                  Prompt: "${prompt}"
                  
                  User's Transcript:
                  "${userTranscript}"
                  
                  Please provide:
                  1. Analysis of content relevance to the topic
                  2. Evaluation of vocabulary usage and variety
                  3. Assessment of sentence structure and complexity
                  4. Overall speaking proficiency assessment
                  5. A score out of 10 for the response
                  6. Specific tips for improvement
                  
                  Format your response as JSON with the following fields:
                  - contentScore (number 0-5)
                  - vocabularyScore (number 0-2)
                  - structureScore (number 0-3)
                  - overallScore (number 0-10)
                  - keyPointsCovered (array of strings)
                  - missingPoints (array of strings)
                  - feedback (string with overall assessment)
                  - improvementTips (array of strings)
                  
                  Keep the response under 300 words.`
              }
            ]
          }
        ]
      };
      
      return this.callGeminiAPI(promptText);
    }
    
    // Analyze filler words in a transcript
    async analyzeFillers(prompt) {
      const promptText = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        }
      };
      
      return this.callGeminiAPI(promptText);
    }
    
    // Call Gemini API
    async callGeminiAPI(prompt) {
      try {
        const url = `${this.baseUrl}?key=${this.apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(prompt)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini API error details:', errorData);
          
          // Handle expired API key specifically
          if (errorData.error?.message?.includes('API key expired')) {
            console.error('API key has expired. Please update the API key in GeminiService.js');
            // Return mock response for expired key
            return this.getMockResponse();
          }
          
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extract text from response
        let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean up markdown formatting if present
        if (responseText.includes('```json')) {
          // Remove markdown code block formatting
          responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        
        // Parse JSON response
        try {
          return JSON.parse(responseText);
        } catch (error) {
          console.error('Error parsing Gemini response as JSON:', error);
          console.log('Raw response was:', responseText);
          
          // Try to extract JSON from the response if it's embedded in text
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error('Failed to extract JSON from response:', e);
            }
          }
          
          return {
            error: true,
            message: 'Failed to parse Gemini response',
            rawResponse: responseText
          };
        }
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Return a mock response in case of API failure
        return this.getMockResponse();
      }
    }
    
    // Mock response for development
    getMockResponse() {
      return {
        score: 0.8,
        fillers: [
          { word: "um", count: 2 },
          { word: "like", count: 1 }
        ],
        total_fillers: 3,
        feedback: "Good speaking with minimal filler words. Try to reduce the use of 'um' and 'like'."
      };
    }
  }
  
  // Create singleton instance
  const geminiService = new GeminiService();
  
  export default geminiService;