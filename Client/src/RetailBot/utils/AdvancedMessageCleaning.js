/**
 * Advanced message cleaning logic for handling complex data leakage patterns
 */

/**
 * Cleans a message to remove any metadata, alternative responses, instructions,
 * or other unwanted content that might have leaked into the message.
 * 
 * @param {string} message - The original message text
 * @returns {string} - The cleaned message text
 */
export function advancedCleanMessage(message) {
    if (!message) return '';
    
    let cleanedMessage = message;
    
    // 1. Extract the main content if surrounded by quotes
    const quotedTextRegex = /^['"](.+?)['"]$/;
    const quotedMatch = message.match(quotedTextRegex);
    if (quotedMatch && quotedMatch[1]) {
      cleanedMessage = quotedMatch[1];
    }
    
    // 2. Handle comma-separated quoted options (keep only the first one)
    // Example: '"Option 1", "Option 2", "Option 3"'
    const quotedOptionsRegex = /^['"](.+?)['"],\s*['"](.+?)['"](?:,\s*['"](.+?)['"])*$/;
    const quotedOptionsMatch = cleanedMessage.match(quotedOptionsRegex);
    if (quotedOptionsMatch && quotedOptionsMatch[1]) {
      cleanedMessage = quotedOptionsMatch[1];
    }
    
    // 3. Remove any text in square brackets (often instructions)
    cleanedMessage = cleanedMessage.replace(/\[.*?\]/g, '');
    
    // 4. Remove any text in angle brackets (often formatting or template instructions)
    cleanedMessage = cleanedMessage.replace(/<(?!br|p|div|span|\/)[^>]*>/g, '');
    
    // 5. Remove common metadata phrases
    const phrasesToRemove = [
      'circular questions',
      'But what about...',
      'I\'m not sure',
      'Let me think about it',
      'Option 1:',
      'Option 2:',
      'Option 3:',
      'Alternative:',
      'Or alternatively:',
      'Response options:',
      'Conversation:',
      'Response:',
      'Choose from:'
    ];
    
    phrasesToRemove.forEach(phrase => {
      // Remove the phrase if it appears at the beginning of the message
      const startPattern = new RegExp(`^${phrase}\\s*`, 'i');
      cleanedMessage = cleanedMessage.replace(startPattern, '');
      
      // Remove the phrase if it appears in quotes
      const quotedPattern = new RegExp(`['"]${phrase}['"]\\s*`, 'i');
      cleanedMessage = cleanedMessage.replace(quotedPattern, '');
      
      // Remove the phrase if it appears anywhere (careful with this)
      const generalPattern = new RegExp(`\\b${phrase}\\b`, 'i');
      cleanedMessage = cleanedMessage.replace(generalPattern, '');
    });
    
    // 6. Smart detection of multiple options (numbered lists followed by OR)
    cleanedMessage = cleanedMessage.replace(/^\d+\.\s+(.+?)(?:\s+OR\s+|\s+or\s+|\s+\/\s+).+$/gm, '$1');
    
    // 7. Clean up any remaining artifacts
    cleanedMessage = cleanedMessage
      // Remove unnecessary quotation marks at the beginning and end
      .replace(/^["'](.+)["']$/, '$1')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanedMessage;
  }
  
  /**
   * Extracts the actual message from a potentially complicated string
   * with multiple sections or options.
   * 
   * @param {string} messageText - The message text to analyze
   * @returns {string} - The extracted main message
   */
  export function extractMainMessage(messageText) {
    if (!messageText) return '';
    
    // First, apply the advanced cleaning
    let extractedMessage = advancedCleanMessage(messageText);
    
    // Try to identify the main message if there are patterns like question/response
    const patterns = [
      // Pattern: "Question: X, Response: Y"
      {
        regex: /(?:question|prompt|user):\s*"?([^"]+)"?,\s*(?:response|answer|assistant|bot):\s*"?([^"]+)"?/i,
        extract: (match) => match[2] // Extract the response part
      },
      // Pattern: Various formats of multiple options
      {
        regex: /(?:option\s*\d+|alternative\s*\d+|response\s*\d+):\s*"?([^"]+)"?/i,
        extract: (match) => match[1] // Extract the first option
      }
    ];
    
    for (const pattern of patterns) {
      const match = extractedMessage.match(pattern.regex);
      if (match) {
        const extracted = pattern.extract(match);
        if (extracted) {
          extractedMessage = extracted;
          break;
        }
      }
    }
    
    // Final cleanup
    return extractedMessage.trim();
  }
  
  export default {
    advancedCleanMessage,
    extractMainMessage
  };