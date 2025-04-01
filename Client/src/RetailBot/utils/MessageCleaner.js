/**
 * Utility functions to clean message content and prevent data leakage
 */

// Common patterns that indicate data leakage from model responses
const LEAKAGE_PATTERNS = [
    // Pattern for alternative responses like 'But what about...', 'I'm not sure', etc.
    /['"]([^'"]*?)['"],\s*['"]([^'"]*?)['"],\s*['"]([^'"]*?)['"],\s*([^'"]*?)['"]([^'"]*?)['"]/g,
    
    // Pattern for instructions within responses
    /\bcircular questions\b/g,
    
    // Common prefixes that should be removed
    /^['"]([^'"]*?)['"]\s*/g,
    
    // Common internal notations
    /\(Response options:.*?\)/g,
    /\(Choose one of the following\)/g,
    /\(Alternative responses\)/g,
    
    // Alternative response fragments
    /'But what about...'/g,
    /'I'm not sure'/g,
    /'Let me think about it'/g,
    
    // Any text in [square brackets] which often indicates instructions
    /\[.*?\]/g,
    
    // Text in <angled brackets> which might be template placeholders
    /<(?!br|p|div|span)[^>]*>/g,
    
    // Phrases like "Option 1:", "Alternative:", etc.
    /\b(Option \d+:|Alternative:)\s*/g,
    
    // Any numbered list patterns that look like options
    /^\d+\.\s+(.*?)(?:\s+OR\s+|\s+or\s+|\s+\/\s+)/gm,
    
    // Remove weird characters that sometimes appear
    /[^\x20-\x7E\s]/g,
    
    // Remove text like "Response:" or "Customer:" that might appear
    /\b(Response:|Customer:|Assistant:|AI:|Agent:)\s*/g
  ];
  
  /**
   * Removes quotes at the beginning and end of a string
   * @param {string} str - String to process
   * @returns {string} - String with outer quotes removed
   */
  const removeOuterQuotes = (str) => {
    if (!str) return '';
    return str.replace(/^["'](.+)["']$/, '$1');
  };
  
  /**
   * Cleans message content to remove potential data leakage
   * @param {string} content - The raw message content
   * @returns {string} - The cleaned message content
   */
  export const cleanMessageContent = (content) => {
    if (!content) return '';
    
    let cleanedContent = content;
    
    // First, if the entire content is wrapped in quotes, extract the content
    cleanedContent = removeOuterQuotes(cleanedContent);
    
    // Check for multiple quoted options and keep only the first one
    const quotedOptionsMatch = cleanedContent.match(/^['"]([^'"]+)['"]\s*,\s*['"]/);
    if (quotedOptionsMatch && quotedOptionsMatch[1]) {
      return quotedOptionsMatch[1]; // Return just the first option
    }
    
    // Apply all pattern removals
    LEAKAGE_PATTERNS.forEach(pattern => {
      // For the first pattern which captures quotes with alternatives, 
      // we want to keep just the first quoted string
      if (pattern.toString().includes("([^'\"]*?)['']")) {
        const match = pattern.exec(cleanedContent);
        if (match && match[1]) {
          // Replace the entire matched string with just the first quoted part
          cleanedContent = cleanedContent.replace(pattern, match[1]);
        }
      } else {
        // For other patterns, simply remove the matches
        cleanedContent = cleanedContent.replace(pattern, '');
      }
    });
    
    // Remove any double quotes at the beginning and end again (in case of nested quotes)
    cleanedContent = removeOuterQuotes(cleanedContent);
    
    // Trim any extra whitespace and normalize spaces
    cleanedContent = cleanedContent.trim().replace(/\s+/g, ' ');
    
    return cleanedContent;
  };
  
  /**
   * Advanced cleaning for complex cases
   * @param {string} content - The raw message content
   * @returns {string} - The deeply cleaned message content
   */
  export const deepCleanMessageContent = (content) => {
    if (!content) return '';
    
    let cleanedContent = cleanMessageContent(content);
    
    // Additional deep cleaning for stubborn patterns
    
    // Handle case where there are multiple sections with "Question:" and "Response:"
    const responseMatch = cleanedContent.match(/(?:question|prompt):[^]*?response:(.*)/i);
    if (responseMatch && responseMatch[1]) {
      return cleanMessageContent(responseMatch[1]);
    }
    
    return cleanedContent;
  };
  
  export default {
    cleanMessageContent,
    deepCleanMessageContent
  };