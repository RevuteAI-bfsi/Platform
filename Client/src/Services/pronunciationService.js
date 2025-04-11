import { GoogleGenerativeAI } from "@google/generative-ai";

export class PronunciationService {
    constructor(){
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
                topP: 0.8,
                topK: 40,
            }
        });
    }

    async analyzePronunciation(userTranscript, referenceText){
       try{
          if (!userTranscript || !referenceText) {
            throw new Error('Both user transcript and reference text are required');
          }

          const prompt = this.createAnalysisPrompt(userTranscript, referenceText);
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          
          if (!response || !response.text()) {
            throw new Error('Empty response from Gemini API');
          }

          const analysis = this.parseGeminiResponse(response.text());
          this.validateAnalysis(analysis);
          
          return analysis;
       } catch (error){
          console.error("Error analyzing pronunciation:", error);
          throw new Error(`Pronunciation analysis failed: ${error.message}`);
       }
    }

    createAnalysisPrompt(userTranscript, referenceText){
        return `
        You are an expert English pronunciation analyzer. Analyze the following reading exercise and provide detailed feedback.

        Reference Text:
        "${referenceText}"

        User's Reading:
        "${userTranscript}"

        Please analyze the following aspects and provide scores from 0 to 1:
        1. Phoneme Accuracy: How accurately each sound is pronounced
        2. Stress Pattern: Correct placement of word and sentence stress
        3. Intonation: Appropriate rise and fall of pitch
        4. Rhythm: Natural flow and timing of speech

        For each mispronounced word, provide:
        - The word as written
        - How it was pronounced
        - The correct pronunciation
        - A suggestion for improvement

        Format your response as a JSON object with the following structure:
        {
            "phonemeAccuracy": number (0-1),
            "stressPattern": number (0-1),
            "intonation": number (0-1),
            "rhythm": number (0-1),
            "overallScore": number (0-1),
            "mispronunciations": [
                {
                    "word": string,
                    "userPronunciation": string,
                    "correctPronunciation": string,
                    "suggestion": string
                }
            ],
            "feedback": {
                "overall": string,
                "strengths": string[],
                "improvements": string[]
            }
        }

        Ensure all scores are between 0 and 1, and provide specific, actionable feedback.
        `;
    }

    parseGeminiResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid response format from Gemini');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            throw new Error(`Failed to parse Gemini response: ${error.message}`);
        }
    }

    validateAnalysis(analysis) {
        const requiredFields = [
            'phonemeAccuracy', 'stressPattern', 'intonation', 
            'rhythm', 'overallScore', 'mispronunciations', 'feedback'
        ];

        for (const field of requiredFields) {
            if (!(field in analysis)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate score ranges
        const scoreFields = ['phonemeAccuracy', 'stressPattern', 'intonation', 'rhythm', 'overallScore'];
        for (const field of scoreFields) {
            const score = analysis[field];
            if (typeof score !== 'number' || score < 0 || score > 1) {
                throw new Error(`Invalid score for ${field}: ${score}`);
            }
        }

        // Validate mispronunciations array
        if (!Array.isArray(analysis.mispronunciations)) {
            throw new Error('mispronunciations must be an array');
        }

        // Validate feedback object
        const feedback = analysis.feedback;
        if (!feedback.overall || !Array.isArray(feedback.strengths) || !Array.isArray(feedback.improvements)) {
            throw new Error('Invalid feedback structure');
        }
    }
}