"""
Banking Customer Service Training Conversation Manager
----------------------------------------------------
This module manages the simulated customer conversations for banking service training.
It handles persona management, response generation, and conversation analysis.

Key components:
1. LLM integration with both LangChain and direct Groq API implementations
2. Customer persona simulation with trait-based response generation
3. Banking product lookup from CSV data
4. Conversation analysis for bank representative feedback
"""

import os
import json
import random
import re
from typing import Dict, List, Any, Optional
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from pydantic.v1 import BaseModel, Field
from langchain.memory import ConversationBufferMemory

# Direct Groq API integration
from groq import Groq

# CSV data handling
import pandas as pd

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# ==============================
# LLM Configuration and Clients
# ==============================

# System instruction to prevent data leakage
anti_leakage_instruction = """
When generating responses, provide ONLY the direct content requested.
DO NOT include:
- Meta comments like "Changes subject" or "circular questions"
- Alternative suggestions in quotes
- Multiple choices with commas or "or"
- Phrases in quotation marks unless they're part of the actual response
- Explanations or instructions about the response
"""

# Initialize LLM with Groq API via LangChain
llm = ChatGroq(
    temperature=0.7,  # Higher temperature for more varied and natural responses
    model_name="llama3-70b-8192",  # Using a model that exists in Groq
    api_key=os.environ.get("GROQ_API_KEY"),
    max_tokens=100,  # Allow for longer responses
    system=anti_leakage_instruction  # Added system instruction to prevent data leakage
)

# Lower temperature LLM configuration for analysis (needs more consistency)
llm_analysis = ChatGroq(
    temperature=0.1,  # Lower temperature for consistent analysis
    model_name="llama3-70b-8192",  # Same model
    api_key=os.environ.get("GROQ_API_KEY")
)

# Initialize direct Groq API client as an alternative to LangChain
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Active conversations storage
active_conversations = {}

# ==============================
# Clean AI Response Function
# ==============================

def clean_ai_response(response_text: str) -> str:
    """
    Clean AI-generated text to remove data leakage patterns.
    This is performed server-side before sending responses to the frontend.
    
    Args:
        response_text: Raw response from the AI model
        
    Returns:
        Cleaned response text
    """
    if not response_text:
        return ""
    
    # Log the original response for debugging
    print(f"Original AI response: {response_text}")
    
    # STEP 1: Extract quoted content when surrounded by patterns like:
    # "Changes subject, incomplete questions, 'Sorry, what were you saying?' "Actual response""
    complex_pattern = r'(?:[\w\s,\'-]+,\s*)?[\'"].*?[\'"]\s*[\'"](.+?)[\'"]'
    complex_match = re.search(complex_pattern, response_text)
    if complex_match and complex_match.group(1):
        cleaned_text = complex_match.group(1)
        if len(cleaned_text) > 5:  # Ensure we have meaningful content
            print(f"Cleaned with complex pattern: {cleaned_text}")
            return cleaned_text
    
    # STEP 2: Check for simple quoted content
    # Sometimes the response is just '"This is the actual response"'
    quoted_pattern = r'^[\'"](.+?)[\'"]$'
    quoted_match = re.search(quoted_pattern, response_text)
    if quoted_match and quoted_match.group(1):
        cleaned_text = quoted_match.group(1)
        print(f"Cleaned with quoted pattern: {cleaned_text}")
        return cleaned_text
    
    # STEP 3: Remove specific instruction patterns
    patterns_to_remove = [
        # Instruction prefixes
        r'^Changes subject,\s*', 
        r'^incomplete questions,\s*',
        r'^redirects conversation,\s*',
        r'^circular questions\s*',
        
        # Alternative responses
        r'\'But what about\.\.\.\'',
        r'\'I\'m not sure\'',
        r'\'Let me think about it\'',
        r'\'Sorry, what were you saying\?\'',
        
        # Quoted alternatives like '"Option 1", "Option 2"'
        r'[\'"]([^\'"]*)[\'"]\s*,\s*[\'"]([^\'"]*)[\'"]\s*(?:,\s*[\'"]([^\'"]*)[\'"]\s*)*',
        
        # Format instructions
        r'\[.*?\]',  # Anything in [square brackets]
        r'\(Response options:.*?\)',
        r'\(Choose one of the following\)',
        r'\(Alternative responses\)',
        
        # Role markers
        r'^Customer:\s*',
        r'^Response:\s*',
        r'^AI:\s*',
        r'^Agent:\s*'
    ]
    
    cleaned_text = response_text
    for pattern in patterns_to_remove:
        # For the alternative responses pattern, keep only the first match
        if 'Option' in pattern or '([^\'"]*)[\'"]\\s*,' in pattern:
            match = re.search(pattern, cleaned_text)
            if match and match.group(1):
                cleaned_text = match.group(1)
        else:
            # For other patterns, simply remove them
            cleaned_text = re.sub(pattern, '', cleaned_text, flags=re.IGNORECASE)
    
    # STEP 4: Final cleanup
    # Remove any remaining quotes at beginning and end
    cleaned_text = re.sub(r'^[\'"](.+)[\'"]$', r'\1', cleaned_text)
    
    # Clean up extra whitespace
    cleaned_text = cleaned_text.strip()
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
    
    print(f"Final cleaned text: {cleaned_text}")
    return cleaned_text

# ==============================
# Banking Knowledge Lookup
# ==============================

def lookup_banking_info(query_type: str, products_df: pd.DataFrame, product_type: str = None) -> str:
    """
    Look up banking information from CSV data based on query type.
    
    This function retrieves information about banking products from the products CSV
    based on the type of query and product category.
    
    Args:
        query_type: Type of information requested (fees, rates, features, etc.)
        products_df: DataFrame containing product information
        product_type: Optional product category to filter by
        
    Returns:
        Formatted banking information string
    """
    if products_df is None or len(products_df) == 0:
        return "Banking product information not available."
    
    # Filter products by type if specified
    filtered_df = products_df
    if product_type:
        filtered_df = products_df[products_df['category'].str.contains(product_type, case=False)]
        if len(filtered_df) == 0:
            filtered_df = products_df  # Fallback to all products if no matches
    
    # Get relevant information based on query type
    if query_type.lower() == "interest_rates":
        # Extract products with their interest rates
        rates_info = filtered_df[['name', 'category', 'interest_rate']].sort_values('interest_rate', ascending=False)
        if len(rates_info) == 0:
            return "No interest rate information available for this product type."
        
        # Format response
        response = "Current interest rates:\n"
        for _, row in rates_info.iterrows():
            response += f"- {row['name']} ({row['category']}): {row['interest_rate']}%\n"
        
        return response
        
    elif query_type.lower() == "fees":
        # Extract fee information
        fees_info = filtered_df[['name', 'category', 'monthly_fee', 'requirements_to_waive_fee']]
        if len(fees_info) == 0:
            return "No fee information available for this product type."
        
        # Format response
        response = "Fee information:\n"
        for _, row in fees_info.iterrows():
            response += f"- {row['name']} ({row['category']}): ₹{row['monthly_fee']} monthly"
            if row['requirements_to_waive_fee']:
                response += f" (Can be waived: {row['requirements_to_waive_fee']})\n"
            else:
                response += "\n"
        
        return response
        
    elif query_type.lower() == "features":
        # Extract key features information
        features_info = filtered_df[['name', 'category', 'key_features']]
        if len(features_info) == 0:
            return "No feature information available for this product type."
        
        # Format response
        response = "Key features:\n"
        for _, row in features_info.iterrows():
            response += f"- {row['name']} ({row['category']}): {row['key_features']}\n"
        
        return response
    
    # Default case - return basic product information
    basic_info = filtered_df[['name', 'category', 'minimum_deposit', 'monthly_fee', 'interest_rate']].head(5)
    if len(basic_info) == 0:
        return "No product information available for this query."
    
    # Format response
    response = "Banking products information:\n"
    for _, row in basic_info.iterrows():
        response += f"- {row['name']} ({row['category']}): Min deposit ₹{row['minimum_deposit']}, Monthly fee ₹{row['monthly_fee']}, Interest rate {row['interest_rate']}%\n"
    
    return response

# ==============================
# Prompt Templates
# ==============================

# Prompt for initial customer greeting - Updated for banking context
initial_greeting_prompt = PromptTemplate.from_template(
    """You are an Indian banking customer in a conversation with a bank representative. Here is your profile:
    
    Customer traits:
    - Name: {customer_name}
    - Age: {customer_age}
    - Customer type: {customer_type}
    - Banking history: {banking_history}
    - Patience level: {patience_level}
    - Politeness: {politeness}
    - Knowledge level: {knowledge_level}
    - Primary concern: {primary_concern}
    
    Scenario: {scenario_title}
    Entry behavior: {entry_behavior}
    Current need: {customer_objective}
    
    Generate a natural greeting to the bank representative that clearly shows your personality traits.
    Give the response according to how the representative is speaking to you.
    
    ALWAYS start with a greeting like "Hello", "Hi", or "Namaste".
    
    Your response should be 15-25 words that sound like natural spoken Indian English with occasional Hindi phrases if appropriate.
    
    IMPORTANT: Provide ONLY the customer's response. DO NOT include instructions, alternatives, or metadata.
    DO NOT include phrases like "Changes subject," or "circular questions" or "Sorry, what were you saying?"
    DO NOT wrap your response in quotes or add any prefixes.
    
    Examples based on different personas:
    
    [Impatient, Premium customer]: "Hello. I'm having issues with charges on my premium account. I need this resolved immediately."
    
    [Polite, New applicant]: "Namaste. I wanted to know about opening my first savings account. Could you explain the process?"
    
    [Tech-savvy, Digital user]: "Hi there! My UPI transactions are failing since yesterday. Can you check what's happening?"
    
    [Anxious, Overdraft concern]: "Hello... I noticed some overdraft charges on my account. I'm worried about how this affects me."
    """
)

# Prompt for ongoing customer conversation responses - Updated for banking
customer_response_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an Indian banking customer with these traits:
    
    Customer profile:
    - Name: {customer_name} ({customer_gender}, {customer_age} years old)
    - Customer type: {customer_type}
    - Banking history: {banking_history} 
    - Patience: {patience_level}
    - Politeness: {politeness}
    - Banking knowledge: {knowledge_level}
    - Primary concern: {primary_concern}
    
    Current banking scenario: {scenario_title}
    - Current need: {customer_objective}
    - Specific concerns: {specific_interests}
    
    IMPORTANT GUIDELINES:
    1. Respond in 15-25 words that feel natural and conversational
    2. Your personality should clearly reflect the traits above
    3. Speak naturally like a real person talking to a bank representative
    4. Respond directly to what the representative just said
    5. If satisfied after a meaningful interaction, respond with "Thank you" to end the conversation
    6. Use Indian English speech patterns with occasional Hindi phrases when appropriate
    7. Give the response according to how the representative is speaking to you
    8. Keep the previous conversation in mind and respond accordingly
    
    CRITICAL: Provide ONLY the customer's direct response. DO NOT include:
    - Metadata phrases like "Changes subject," or "Redirects conversation"
    - Alternative responses like 'But what about...' or 'I'm not sure'
    - Instructions or explanations about the response
    - DO NOT use quotes or other markup in your response
    - DO NOT number or bullet your response
    - Avoid phrases like "Changes subject", "incomplete questions", or "Sorry, what were you saying"
    
    The conversation so far:
    {conversation_history}
    """),
    ("human", "Bank Representative: {bank_representative_message}"),
])

# ==============================
# Analysis Models & Prompts
# ==============================

# Define output schemas for conversation analysis
class CategoryScores(BaseModel):
    """Updated score categories for banking service assessment"""
    banking_knowledge: int = Field(description="Score from 0-100 on banking product and service knowledge")
    customer_handling: int = Field(description="Score from 0-100 on customer interaction skills")
    policy_adherence: int = Field(description="Score from 0-100 on adherence to banking policies and regulations")
    
    # Legacy fields for backward compatibility
    grammar: int = Field(description="Score from 0-100 on grammar and language use")
    communication: int = Field(description="Score from 0-100 on communication skills")
    customer_respect: int = Field(description="Score from 0-100 on showing respect to customer")
    solution_approach: int = Field(description="Score from 0-100 on approach to solving customer needs")

class PerformanceAnalysis(BaseModel):
    """Updated performance analysis model with banking-specific metrics"""
    overall_score: int = Field(description="Overall performance score from 0-100")
    category_scores: CategoryScores = Field(description="Scores across different performance categories")
    improvement_suggestions: List[str] = Field(description="3-5 actionable improvement suggestions")
    
    # Legacy fields for backward compatibility
    observations: List[str] = Field(description="5 specific observations about the trainee's performance")
    highlight: str = Field(description="1 highlight of what the trainee did particularly well")

# Analysis prompt for evaluating bank representative performance
analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a banking customer service training expert analyzing a conversation between a bank representative and a customer.

SCENARIO INFORMATION:
- Title: {scenario_title}
- Customer type: {customer_type}
- Customer objective: {customer_objective}
- Training focus: {training_focus}
- Ideal resolution: {ideal_resolution}

CUSTOMER INFORMATION:
- Name: {customer_name}
- Customer type: {customer_type}
- Patience level: {patience_level}
- Politeness: {politeness}
- Knowledge level: {knowledge_level}
- Primary concern: {primary_concern}

CONVERSATION TRANSCRIPT:
{conversation_history}

Provide your analysis with these EXACT section headers:

**Overall Score: [0-100]** 
(An overall assessment of the bank representative's performance)

**Banking Knowledge Score: [0-100]**
(Evaluation of banking product, service, and policy knowledge demonstrated)

**Customer Handling Score: [0-100]**
(How well the representative adapted to and respected customer needs)

**Policy Adherence Score: [0-100]**
(How correctly banking policies and regulations were followed and explained)

**Specific Improvement Suggestions:**
1. **[First suggestion title]**: [Details]
2. **[Second suggestion title]**: [Details]
3. **[Third suggestion title]**: [Details]

Be honest but constructive in your feedback. Focus on practical improvements for banking customer service.
""")
])

# Output parser for analysis - converts LLM output to structured data
analysis_parser = JsonOutputParser(pydantic_object=PerformanceAnalysis)

# ==============================
# Conversation Utility Functions
# ==============================

def detect_misgendering(message: str, customer: Dict[str, Any]) -> bool:
    """
    Detect if the bank representative is using incorrect gender terms for the customer.
    
    Args:
        message: The user's message text
        customer: Dictionary containing customer information
        
    Returns:
        Boolean indicating if misgendering was detected
    """
    message = message.lower()
    customer_gender = customer.get("gender", "").lower()
    
    # Check for misgendering based on customer's gender
    if customer_gender == "female" and any(term in message for term in ["sir", "bhai", "bhaiya", "gentleman", "brother"]):
        return True
    
    if customer_gender == "male" and any(term in message for term in ["ma'am", "madam", "miss", "sister", "lady", "didi"]):
        return True
    
    return False

def detect_question_type(message: str) -> str:
    """
    Determine what type of question the bank representative is asking.
    
    This helps the bot respond appropriately to common question types
    without always needing to call the LLM, improving reliability.
    
    Args:
        message: The user's message text
        
    Returns:
        String identifier of the question type
    """
    message = message.lower()
    
    # Check for personal questions about the customer
    if any(phrase in message for phrase in ["your name", "what is your name", "who are you", "may i know your name"]):
        return "ASKING_NAME"
    
    if any(phrase in message for phrase in ["how are you", "how do you do", "how is your day"]):
        return "ASKING_WELLBEING"
        
    # Check for greetings
    if any(greeting in message for greeting in ["hello", "hi", "namaste", "greetings"]):
        return "GREETING"
    
    # Check for banking specific questions
    if any(phrase in message for phrase in ["account number", "customer id", "identification", "verify your identity"]):
        return "ASKING_IDENTITY"
        
    if any(phrase in message for phrase in ["purpose of your visit", "how can i help", "what brings you"]):
        return "ASKING_PURPOSE"
        
    if any(phrase in message for phrase in ["interest rate", "roi", "what rate", "interest percentage"]):
        return "ASKING_INTEREST_RATE"
        
    if any(phrase in message for phrase in ["fee", "charges", "service charge", "maintenance", "minimum balance"]):
        return "ASKING_FEES"
    
    # Default case
    return "GENERAL_QUESTION"

def generate_alternative_response():
    """
    Generate alternative responses when the LLM fails or produces unsuitable output.
    
    These responses are varied based on different banking persona types to maintain
    a natural conversation flow even in error conditions.
    
    Returns:
        A natural-sounding fallback response string
    """
    # These responses vary based on different banking persona types
    premium_customer_responses = [
        "I expect better service given my account status. What options do I have?",
        "As a premium client, I need this resolved quickly. What can you do?",
        "I've been with your bank for years. How will you address this issue?",
        "My relationship manager usually handles this. Can you check my account notes?"
    ]
    
    new_applicant_responses = [
        "I'm new to banking. Could you explain the process more simply?",
        "What documents do I need to open an account?",
        "I'm comparing different banks. What makes your accounts special?",
        "Are there any hidden charges I should know about?"
    ]
    
    digital_banking_responses = [
        "The app keeps showing an error. How can I fix this?",
        "Is the server down? My transactions aren't going through.",
        "I prefer solving this online. Is there a digital solution?",
        "The authentication process isn't working. What should I do?"
    ]
    
    overdraft_concern_responses = [
        "Will this affect my credit score? I'm worried about that.",
        "I don't understand why these charges were applied. Can you explain?",
        "Is there any way to avoid these fees in the future?",
        "When will the overdraft charges be removed from my account?"
    ]
    
    # Combine all response types for variety
    all_responses = premium_customer_responses + new_applicant_responses + digital_banking_responses + overdraft_concern_responses
    return random.choice(all_responses)

def apply_persona_to_response(response: str, customer: Dict[str, Any], traits: Dict[str, Any]) -> str:
    """
    Enhance responses with persona-specific patterns and expressions.
    
    This function modifies generated responses to better match the customer's
    personality traits, making the conversation more realistic and consistent.
    
    Args:
        response: The base response text
        customer: Dictionary containing customer traits
        traits: Dictionary containing personality trait information
        
    Returns:
        Enhanced response with persona-specific patterns
    """
    # Get customer traits
    patience = customer.get("patience_level", "Medium").lower()
    knowledge_level = customer.get("knowledge_level", "Medium").lower()
    politeness = customer.get("politeness", "Medium").lower()
    customer_type = customer.get("customer_type", "").lower()
    
    # Get personality trait patterns from traits data
    speech_patterns = traits.get("speech_patterns", "").split(";")
    
    # Apply trait-specific transformations
    modified_response = response
    
    # Apply speech patterns if available
    if speech_patterns and len(speech_patterns) > 0:
        # 30% chance to add a speech pattern to make it natural but not overdone
        if random.random() < 0.3 and len(speech_patterns) > 0:
            pattern = random.choice(speech_patterns).strip()
            if pattern and not any(pattern in modified_response for pattern in speech_patterns):
                modified_response = f"{pattern} {modified_response}"
    
    # Apply patience level transformations
    if patience == "low":
        # Add impatience indicators for low patience customers
        impatience_markers = ["Quickly,", "Jaldi batao,", "Look,", "Just tell me,"]
        if random.random() < 0.4 and not any(marker in modified_response for marker in impatience_markers):
            modified_response = f"{random.choice(impatience_markers)} {modified_response}"
    
    # Apply banking knowledge transformations
    if knowledge_level == "high" and "technical" in response.lower():
        # Add banking jargon for knowledgeable customers
        banking_terms = ["APY", "IMPS", "NACH mandate", "CIBIL score", "CASA ratio"]
        if not any(term in modified_response for term in banking_terms) and random.random() < 0.5:
            modified_response = modified_response.replace("it", random.choice(banking_terms))
    
    # Apply customer type specific transformations
    if "premium" in customer_type.lower() and random.random() < 0.4:
        premium_phrases = ["As a premium customer,", "Given my account status,", "I expect better service,"]
        if not any(phrase in modified_response for phrase in premium_phrases):
            modified_response = f"{random.choice(premium_phrases)} {modified_response}"
    
    # Don't make changes every time - sometimes keep the original for naturalness
    return modified_response if random.random() < 0.7 else response

def format_conversation_history(history: List[Dict[str, str]], max_turns=8) -> str:
    """
    Format conversation history to maintain better context for LLM prompt.
    
    Maintains the most recent interaction history for context.
    
    Args:
        history: List of conversation messages
        max_turns: Maximum number of turns to include
        
    Returns:
        Formatted conversation history string
    """
    recent_history = history[-max_turns:] if len(history) > max_turns else history
    
    formatted = ""
    for entry in recent_history:
        role = entry["role"]
        message = entry["message"]
        if role == "user":
            formatted += f"Bank Representative: {message}\n"
        else:
            formatted += f"Customer: {message}\n"
    return formatted

def is_conversation_ending(user_message: str, conversation_history: List[Dict[str, str]]) -> bool:
    """
    Determine if the conversation should naturally end based on context.
    
    This function identifies when a customer inquiry has been resolved or when
    the conversation has reached a natural conclusion point.
    
    Args:
        user_message: The user's latest message
        conversation_history: List of previous conversation messages
        
    Returns:
        Boolean indicating if the conversation should end
    """
    # Keywords that might indicate a satisfied customer or completed transaction
    satisfaction_indicators = [
        "completed your transaction", "processed your request", "submitted your application",
        "resolved your issue", "waived the fee", "updated your account"
    ]
    
    # Check for explicit closing indicators in user message
    closing_indicators = [
        "is there anything else i can help you with", 
        "would you like assistance with anything else", 
        "is there something else you'd like to discuss",
        "have i addressed all your concerns"
    ]
    
    # Minimum conversation length before allowing natural ending
    min_turns = 6
    
    # Check if conversation is long enough and contains satisfaction indicators
    if len(conversation_history) >= min_turns:
        if any(indicator in user_message.lower() for indicator in satisfaction_indicators):
            return True
        if any(indicator in user_message.lower() for indicator in closing_indicators):
            return True
        
    return False

def validate_customer_response(response: str, user_message: str = "", is_initial: bool = False) -> str:
    """
    Validate and fix customer response to ensure it meets our criteria.
    
    This function checks the generated response for issues and fixes them
    to maintain natural conversation flow and persona consistency.
    
    Args:
        response: The generated response text
        user_message: The user's message that triggered this response
        is_initial: Boolean indicating if this is the initial greeting
        
    Returns:
        Validated and fixed response string
    """
    # Apply cleaning to remove data leakage
    response = clean_ai_response(response)
    
    # Check if response is None or empty
    if not response or not response.strip():
        return "Can you explain the charges on my account?" if not is_initial else "Hello! I need some help with my banking issue."
    
    # Ensure initial messages start with a greeting
    if is_initial and not any(greeting in response.lower() for greeting in ["hello", "hi", "namaste"]):
        response = f"Hello! {response}"
    
    # Limit response length to max 50 words
    words = response.split()
    if len(words) > 50:
        response = " ".join(words[:50])
    
    # Check if response is repeating user's message too closely
    if user_message and user_message.lower() in response.lower() and len(user_message) > 15:
        # Get random alternative response based on customer traits
        return generate_alternative_response()
    
    return response

def simplify_persona(customer: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simplify complex personas to focus on 2-3 key traits.
    
    This improves response consistency by focusing the LLM on the most
    distinctive personality traits rather than trying to balance many traits.
    
    Args:
        customer: Dictionary containing customer traits
        
    Returns:
        Simplified customer traits dictionary
    """
    simplified = customer.copy()
    
    # Identify the 2-3 most distinctive traits to focus on
    distinctive_traits = []
    trait_values = {
        "patience_level": customer.get("patience_level", "Medium"),
        "knowledge_level": customer.get("knowledge_level", "Medium"),  # Changed from tech_knowledge
        "politeness": customer.get("politeness", "Medium"),
        "expectation_level": customer.get("expectation_level", "Medium")  # New trait for banking
    }
    
    # Only keep extreme trait values (High/Low) as distinctive
    for trait, value in trait_values.items():
        if value.lower() in ["high", "low", "very high", "very low"]:
            distinctive_traits.append(trait)
    
    # If we have too many distinctive traits, keep only the most extreme ones
    if len(distinctive_traits) > 3:
        # Prioritize certain traits based on customer type
        customer_type = customer.get("customer_type", "").lower()
        
        # For premium customers, prioritize expectation level and politeness
        if "premium" in customer_type:
            priority_traits = ["expectation_level", "politeness", "patience_level"]
        
        # For new applicants, prioritize knowledge level
        elif "new" in customer_type or "applicant" in customer_type:
            priority_traits = ["knowledge_level", "patience_level", "politeness"]
        
        # For dissatisfied customers, prioritize patience level
        elif "dissatisfied" in customer_type:
            priority_traits = ["patience_level", "expectation_level", "politeness"]
            
        # Default prioritization
        else:
            priority_traits = ["patience_level", "politeness", "knowledge_level", "expectation_level"]
        
        # Sort distinctive traits according to priority
        distinctive_traits = sorted(distinctive_traits, 
                                    key=lambda x: priority_traits.index(x) if x in priority_traits else 999)[:3]
    
    # Normalize non-distinctive traits to "Medium"
    for trait in trait_values:
        if trait not in distinctive_traits:
            simplified[trait] = "Medium"
    
    # Log simplified persona for debugging
    print(f"Simplified persona for {customer.get('name')}: Focused on {distinctive_traits}")
    
    return simplified

# ==============================
# Main Response Generation Functions
# ==============================

def generate_customer_response(
    customer: Dict[str, Any],
    scenario: Dict[str, Any],
    traits: Dict[str, Any],
    conversation_history: List[Dict[str, str]],
    user_message: str
) -> str:
    """
    Generate a response from the simulated banking customer using LangChain.
    
    This is the main function that handles all aspects of response generation,
    including error handling, question detection, and persona application.
    
    Args:
        customer: Dictionary containing customer traits
        scenario: Dictionary containing scenario information
        traits: Dictionary containing personality trait information
        conversation_history: List of previous conversation messages
        user_message: The user's latest message
        
    Returns:
        Generated customer response string
    """
    # Add detailed debug log
    print(f"[DEBUG] Processing message: '{user_message}'")
    
    # Check for misgendering - respond appropriately if detected
    if detect_misgendering(user_message, customer):
        gender_term = "ma'am" if customer.get("gender", "").lower() == "female" else "sir"
        politeness = customer.get("politeness", "Medium").lower()
        patience = customer.get("patience_level", "Medium").lower()
        
        # Different responses based on customer traits
        if politeness == "high" and patience != "low":
            return f"Actually, it's {gender_term}. Could you help me with my banking concern?"
        elif patience == "low":
            return f"I'm a {gender_term}, not a {'sir' if gender_term=='ma\'am' else 'ma\'am'}. Let's focus on my account issue."
        else:
            return f"It's {gender_term}, not {'sir' if gender_term=='ma\'am' else 'ma\'am'}. I need help with my banking issue."
    
    # If this is the initial greeting (no history or user message)
    if not conversation_history and not user_message:
        # Use the initial greeting prompt
        greeting_chain = initial_greeting_prompt | llm
        
        try:
            greeting_result = greeting_chain.invoke({
                "customer_name": customer["name"],
                "customer_age": customer["age"],
                "customer_type": customer["customer_type"],  # Changed from shopping_style
                "banking_history": customer.get("banking_history", "Regular customer"),  # New field
                "patience_level": customer["patience_level"],
                "politeness": customer["politeness"],
                "knowledge_level": customer["knowledge_level"],  # Changed from tech_knowledge
                "primary_concern": customer.get("primary_concern", "Account services"),  # Changed from primary_concerns
                "scenario_title": scenario["title"],
                "entry_behavior": scenario["entry_behavior"],
                "customer_objective": scenario["customer_objective"]  # Changed from product_category
            })
            
            # Extract string content from AIMessage if needed
            greeting_text = ""
            if hasattr(greeting_result, 'content'):
                greeting_text = str(greeting_result.content)
            else:
                greeting_text = str(greeting_result)
            
            # Clean, validate and return the greeting
            greeting_text = clean_ai_response(greeting_text)
            return validate_customer_response(greeting_text, "", True)
                
        except Exception as e:
            print(f"Error generating initial greeting: {e}")
            # Fallback initial messages - with greeting
            customer_type = customer.get("customer_type", "").lower()
            
            if "premium" in customer_type:
                fallbacks = [
                    "Hello! I'm having an issue with my premium account that needs immediate attention.",
                    "Namaste. I'm a premium account holder and need assistance with some charges.",
                    "Hi there. My name is {customer['name']}. I need to discuss my account privileges."
                ]
            elif "new" in customer_type or "applicant" in customer_type:
                fallbacks = [
                    "Hello! I'm interested in opening my first account with your bank.",
                    "Namaste. I'd like to know the process for opening a new account.",
                    "Hi. I'm looking for information about your bank's accounts for new customers."
                ] 
            elif "digital" in customer_type:
                fallbacks = [
                    "Hi there! I'm facing issues with your mobile banking app.",
                    "Hello! My UPI transactions are failing since yesterday.",
                    "Namaste. Need help with your internet banking services."
                ]
            else:
                fallbacks = [
                    f"Hello! I need help with a banking issue.",
                    f"Hi there! I have some questions about my account.",
                    f"Namaste! I need assistance with my banking services."
                ]
            return random.choice(fallbacks)
    
    # Check if conversation should end
    if is_conversation_ending(user_message, conversation_history):
        return "Thank you for your help. Have a good day."
    
    # First check if user is asking a common question type that can be handled directly
    if user_message:
        question_type = detect_question_type(user_message)
        print(f"[DEBUG] Detected question type: {question_type}")
        
        # Handle different question types with appropriate responses
        if question_type == "ASKING_NAME":
            patience = customer.get("patience_level", "Medium").lower()
            
            if patience == "low":
                return f"I'm {customer['name']}. Now, can we address my banking concern?"
            else:
                return f"My name is {customer['name']}. I'm here about {scenario['customer_objective']}."
            
        if question_type == "GREETING":
            customer_type = customer.get("customer_type", "").lower()
            if "premium" in customer_type:
                return f"Hello. As I mentioned, I'm a premium customer and I need assistance with {scenario['customer_objective']}."
            else:
                return f"Hello! I need help with {scenario['customer_objective']}. Can you assist me?"
        
        if question_type == "ASKING_WELLBEING":
            politeness = customer.get("politeness", "Medium").lower()
            
            if politeness == "high":
                return "I'm doing well, thank you for asking. Now about the banking matter we were discussing..."
            else:
                return "I'm here to resolve my banking issue. Can we focus on that please?"
    
    # Setup the customer response chain
    response_chain = customer_response_prompt | llm
    
    try:
        # Format conversation history for the prompt
        formatted_history = format_conversation_history(conversation_history)
        
        print(f"[DEBUG] Attempting to generate response with LLM")
        # Invoke the chain with all context
        response_result = response_chain.invoke({
            # Customer profile
            "customer_name": customer["name"],
            "customer_gender": customer.get("gender", ""),
            "customer_age": customer["age"],
            "customer_type": customer["customer_type"],  # Changed from shopping_style
            "banking_history": customer.get("banking_history", "Regular customer"),  # New field
            "patience_level": customer["patience_level"],
            "politeness": customer["politeness"],
            "knowledge_level": customer["knowledge_level"],  # Changed from tech_knowledge
            "primary_concern": customer.get("primary_concern", "Account services"),  # Changed from primary_concerns
            
            # Scenario info
            "scenario_title": scenario["title"],
            "customer_objective": scenario["customer_objective"],  # Changed from product_category
            "specific_interests": scenario.get("specific_interests", ""),  # Changed from customer_objective
            
            # Context
            "conversation_history": formatted_history,
            "bank_representative_message": user_message,  # Changed from sales_associate_message
        })
        
        # Extract string content from AIMessage if needed
        response_text = ""
        if hasattr(response_result, 'content'):
            response_text = str(response_result.content)
        else:
            response_text = str(response_result)
        
        print(f"[DEBUG] LLM generated response: '{response_text}'")
        
        # Clean, validate and enhance the response
        response_text = clean_ai_response(response_text)
        validated_response = validate_customer_response(response_text, user_message)
        enhanced_response = apply_persona_to_response(validated_response, customer, traits)
        
        return enhanced_response
            
    except Exception as e:
        print(f"[DEBUG] Error generating customer response: {str(e)}")
        
        # Handle basic questions even when the LLM fails
        if user_message:
            question_type = detect_question_type(user_message)
            
            # Provide direct responses for common questions even when the LLM fails
            if question_type == "ASKING_NAME":
                return f"I'm {customer['name']}. I'm here about my banking issue."
                
            if question_type == "ASKING_IDENTITY":
                return f"My customer ID is ******789. I've been banking with you for {customer.get('banking_history', '2 years')}."
                
            if question_type == "ASKING_PURPOSE":
                return f"I'm here about {scenario['customer_objective']}. Can you help me with that?"
        
        # Context-aware fallbacks based on conversation stage and customer type
        customer_type = customer.get("customer_type", "").lower()
        
        if len(conversation_history) <= 2:
            # Early conversation fallbacks based on customer type
            if "premium" in customer_type:
                early_fallbacks = [
                    "I expect this issue to be resolved promptly given my premium status.",
                    "My relationship manager usually handles this. Is he available?",
                    "I'd like to speak with someone who's familiar with premium accounts.",
                    "I've been a premium customer for years. How will you help me today?"
                ]
            elif "new" in customer_type or "applicant" in customer_type:
                early_fallbacks = [
                    "What are the required documents for opening an account?",
                    "How long does the account opening process take?",
                    "What's the minimum balance requirement for your accounts?",
                    "Do I need to visit a branch or can everything be done online?"
                ]
            elif "digital" in customer_type:
                early_fallbacks = [
                    "The app keeps showing error code 503. What does that mean?",
                    "When will the system be back online?",
                    "Is there a way to complete this transaction without using the app?",
                    "My password reset link isn't working. What should I do?"
                ]
            else:
                early_fallbacks = [
                    "Can you explain these charges on my statement?",
                    "I need to understand what happened with my account.",
                    "How do I resolve this banking issue?",
                    "What options do I have in this situation?"
                ]
            return random.choice(early_fallbacks)
        else:
            # Later conversation fallbacks - more specific questions
            if "premium" in customer_type:
                later_fallbacks = [
                    "What special consideration can you offer me as a premium customer?",
                    "How quickly can this be resolved?",
                    "I'd like to speak to a manager about this.",
                    "This level of service is below what I expect from my bank."
                ]
            elif "overdraft" in customer_type or "dissatisfied" in customer_type:
                later_fallbacks = [
                    "Will this affect my credit score?",
                    "How can I avoid this happening again?",
                    "Can you waive the fee this one time?",
                    "I don't understand why this happened to my account."
                ]
            else:
                later_fallbacks = [
                    "Can you give me that information in writing?",
                    "How long will this process take?",
                    "What's the next step?",
                    "Is there anything else I need to know?"
                ]
            return random.choice(later_fallbacks)

def generate_customer_response_direct(
    customer: Dict[str, Any],
    scenario: Dict[str, Any],
    traits: Dict[str, Any],
    conversation_history: List[Dict[str, str]],
    user_message: str
) -> str:
    """
    Generate a response directly using the Groq API instead of LangChain.
    
    This alternative implementation bypasses LangChain to use the Groq API
    directly, which can be more reliable in some environments.
    
    Args:
        customer: Dictionary containing customer traits
        scenario: Dictionary containing scenario information
        traits: Dictionary containing personality trait information
        conversation_history: List of previous conversation messages
        user_message: The user's latest message
        
    Returns:
        Generated customer response string
    """
    # Check for misgendering first
    if detect_misgendering(user_message, customer):
        gender_term = "ma'am" if customer.get("gender", "").lower() == "female" else "sir"
        politeness = customer.get("politeness", "Medium").lower()
        
        if politeness == "high":
            return f"Actually, it's {gender_term}. Could you please help me with my banking concern?"
        else:
            return f"It's {gender_term}, not {'sir' if gender_term=='ma\'am' else 'ma\'am'}. Let's focus on my banking issue."
    
    # If this is the initial greeting (no history or user message)
    if not conversation_history and not user_message:
        system_prompt = f"""You are simulating an Indian banking customer named {customer['name']}.
            
Customer profile:
- Age: {customer['age']}
- Customer type: {customer['customer_type']}
- Banking history: {customer.get('banking_history', 'Regular customer')}
- Patience level: {customer['patience_level']}
- Politeness: {customer['politeness']}
- Knowledge level: {customer['knowledge_level']}
- Primary concern: {customer.get('primary_concern', 'Account services')}

Scenario: {scenario['title']}
Entry behavior: {scenario['entry_behavior']}
Current need: {scenario['customer_objective']}

Generate a natural greeting to the bank representative that clearly shows your personality traits.
ALWAYS start with a greeting like "Hello", "Hi", or "Namaste".
Keep it short, just 1-2 sentences that sound natural for spoken Indian English with occasional Hindi phrases if appropriate.

IMPORTANT: Provide ONLY the customer's response. DO NOT include instructions, alternatives, or metadata.
DO NOT include phrases like "Changes subject," or "circular questions" or alternative response options.
DO NOT wrap your response in quotes or add any prefixes."""

        try:
            # Make direct API call to Groq
            completion = groq_client.chat.completions.create(
                model="llama3-70b-8192",  # Using a model that exists in Groq
                messages=[
                    {"role": "system", "content": system_prompt + "\n\n" + anti_leakage_instruction}
                ],
                temperature=0.7,
                max_tokens=100,
                top_p=1,
                stream=False,
            )
            
            # Extract and clean response text
            greeting_text = completion.choices[0].message.content
            greeting_text = clean_ai_response(greeting_text)
            
            # Validate and return the greeting
            return validate_customer_response(greeting_text, "", True)
                
        except Exception as e:
            print(f"Error generating initial greeting with direct Groq API: {e}")
            # Fallback initial messages
            customer_type = customer.get("customer_type", "").lower()
            
            if "premium" in customer_type:
                fallbacks = [
                    "Hello! I'm having an issue with my premium account that needs immediate attention.",
                    "Namaste. I've been a premium account holder for years and need assistance."
                ]
            elif "new" in customer_type or "applicant" in customer_type:
                fallbacks = [
                    "Hello! I'm interested in opening my first account with your bank.",
                    "Namaste. I'd like to know the process for opening a new account."
                ] 
            else:
                fallbacks = [
                    f"Hello! I need help with a banking issue.",
                    f"Hi there! I have some questions about my account."
                ]
            return random.choice(fallbacks)
    
    # Check if conversation should end
    if is_conversation_ending(user_message, conversation_history):
        return "Thank you for your help. Have a good day."
    
    # Format conversation history for the prompt
    formatted_history = format_conversation_history(conversation_history)
    
    # Create system prompt with anti-leakage instructions
    system_prompt = f"""You are simulating an Indian banking customer with these traits:
    
Customer profile:
- Name: {customer['name']} ({customer.get('gender', 'Male/Female')}, {customer['age']} years old)
- Customer type: {customer['customer_type']}
- Banking history: {customer.get('banking_history', 'Regular customer')}
- Patience: {customer['patience_level']}
- Politeness: {customer['politeness']}
- Knowledge level: {customer['knowledge_level']}
- Primary concern: {customer.get('primary_concern', 'Account services')}

Current banking scenario: {scenario['title']}
- Current need: {scenario['customer_objective']}
- Specific concerns: {scenario.get('specific_interests', '')}

IMPORTANT GUIDELINES:
1. Respond in 1-3 short sentences that feel natural and conversational
2. Your personality should clearly reflect the traits above
3. Speak naturally like a real person talking to a bank representative
4. Respond directly to what the representative just said
5. If satisfied after a meaningful interaction, respond with "Thank you" to end the conversation
6. Use Indian English speech patterns with occasional Hindi phrases when appropriate

CRITICAL: Provide ONLY the customer's direct response. DO NOT include:
- Metadata phrases like "Changes subject," or "Redirects conversation"
- Alternative responses like 'But what about...' or 'I'm not sure'
- Instructions or explanations about the response
- DO NOT use quotes or other markup in your response

The conversation so far:
{formatted_history}"""

    try:
        # Create messages array with system prompt and latest user message
        messages = [
            {"role": "system", "content": system_prompt + "\n\n" + anti_leakage_instruction},
            {"role": "user", "content": f"Bank Representative: {user_message}"}
        ]
        
        # Make direct API call to Groq
        completion = groq_client.chat.completions.create(
            model="llama3-70b-8192",
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1,
            stream=False,
        )
        
        # Extract and clean response text
        response_text = completion.choices[0].message.content
        response_text = clean_ai_response(response_text)
        
        # Validate the response
        validated_response = validate_customer_response(response_text, user_message)
        
        # Enhance response with persona-specific traits
        enhanced_response = apply_persona_to_response(validated_response, customer, traits)
        
        return enhanced_response
            
    except Exception as e:
        print(f"Error generating customer response with direct Groq API: {e}")
        
        # Context-aware fallbacks based on customer type
        customer_type = customer.get("customer_type", "").lower()
        
        if "premium" in customer_type:
            fallbacks = [
                "I expect better service as a premium customer. How can you resolve this?",
                "My relationship manager usually handles these issues promptly.",
                "This level of service is below what I expect from my bank.",
                "Please check my account status and privileges."
            ]
        elif "new" in customer_type or "applicant" in customer_type:
            fallbacks = [
                "Could you explain the account options again? I'm new to banking.",
                "What documents do I need to provide?",
                "How soon can I start using the account after opening?",
                "Are there any special offers for new customers?"
            ]
        elif "digital" in customer_type:
            fallbacks = [
                "The app isn't working properly. Is there a technical issue?",
                "I'd prefer to resolve this online rather than visiting a branch.",
                "When will the digital services be fully functional again?",
                "Is there an alternative digital solution I can use meanwhile?"
            ]
        else:
            fallbacks = [
                "Can you explain these charges on my account?",
                "What options do I have in this situation?",
                "When will this issue be resolved?",
                "I need more information about this banking service."
            ]
        return random.choice(fallbacks)

def extract_scores_from_text(text):
    """
    Extract scores and suggestions from text when JSON parsing fails.
    """
    # Default values if extraction fails
    data = {
        "overall_score": 50,
        "category_scores": {
            "banking_knowledge": 50,  # Changed from grammar
            "customer_handling": 50,
            "policy_adherence": 50,   # New field
            "grammar": 50,            # For compatibility
            "communication": 50,      # For compatibility
            "customer_respect": 50,   # For compatibility
            "solution_approach": 50   # For compatibility
        },
        "improvement_suggestions": [],
        "observations": [],
        "highlight": "Performance review completed."
    }
    
    # Extract overall score
    overall_match = re.search(r"Overall Score:?\s*(\d+)", text, re.IGNORECASE)
    if overall_match:
        data["overall_score"] = int(overall_match.group(1))
    
    # Extract banking knowledge score
    banking_match = re.search(r"Banking Knowledge Score:?\s*(\d+)", text, re.IGNORECASE)
    if banking_match:
        score = int(banking_match.group(1))
        data["category_scores"]["banking_knowledge"] = score
        data["category_scores"]["grammar"] = score  # For compatibility
    
    # Extract customer handling score
    customer_match = re.search(r"Customer (Handling|Respect) Score:?\s*(\d+)", text, re.IGNORECASE)
    if customer_match:
        score = int(customer_match.group(2))
        data["category_scores"]["customer_handling"] = score
        data["category_scores"]["customer_respect"] = score  # For compatibility
    
    # Extract policy adherence score (new)
    policy_match = re.search(r"Policy Adherence Score:?\s*(\d+)", text, re.IGNORECASE)
    if policy_match:
        score = int(policy_match.group(1))
        data["category_scores"]["policy_adherence"] = score
        data["category_scores"]["solution_approach"] = score  # For compatibility
    
    # Extract suggestions
    suggestions = []
    
    # Try to find numbered suggestions (common format in the LLM output)
    suggestion_blocks = re.findall(r'\d+\.\s+\*\*(.*?)\*\*:(.*?)(?=\d+\.\s+\*\*|\Z)', text, re.DOTALL)
    if suggestion_blocks:
        for title, content in suggestion_blocks:
            suggestions.append(f"{title.strip()}: {content.strip()}")
    
    # If that didn't work, try simpler patterns
    if not suggestions:
        # Look for numbered lists
        numbered_suggestions = re.findall(r'\d+\.\s+(.*?)(?=\d+\.\s+|\Z)', text, re.DOTALL)
        if numbered_suggestions:
            suggestions = [s.strip() for s in numbered_suggestions if len(s.strip()) > 10]
    
    # If still no suggestions, try bullet points
    if not suggestions:
        bullet_suggestions = re.findall(r'[\*\-•]\s+(.*?)(?=[\*\-•]|\Z)', text, re.DOTALL)
        if bullet_suggestions:
            suggestions = [s.strip() for s in bullet_suggestions if len(s.strip()) > 10]
    
    # Final fallback - just split by newlines and take any line that seems like a suggestion
    if not suggestions:
        potential_suggestions = [line.strip() for line in text.split('\n') 
                              if len(line.strip()) > 15 and len(line.strip()) < 200
                              and not line.strip().startswith('*')]
        
        suggestions = potential_suggestions[:5]  # Take up to 5
    
    if suggestions:
        cleaned_suggestions = []
        for suggestion in suggestions:
            # Clean up markdown and extra spaces
            cleaned = re.sub(r'\*\*|\*', '', suggestion).strip()
            # Remove any leading numbers or bullets
            cleaned = re.sub(r'^\d+\.\s+|^[\*\-•]\s+', '', cleaned).strip()
            if cleaned and len(cleaned) > 10:
                cleaned_suggestions.append(cleaned)
        
        if cleaned_suggestions:
            data["improvement_suggestions"] = cleaned_suggestions[:5]
            data["observations"] = cleaned_suggestions[:5]
    
    return data

def analyze_conversation(
    customer: Dict[str, Any],
    scenario: Dict[str, Any],
    conversation_history: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Analyze the conversation and generate performance feedback.
    
    This function evaluates the bank representative's performance in the conversation
    and provides detailed feedback and scores across different dimensions.
    
    Args:
        customer: Dictionary containing customer traits
        scenario: Dictionary containing scenario information
        conversation_history: List of conversation messages
        
    Returns:
        Analysis results including scores and feedback
    """
    # Format conversation history for analysis
    formatted_conversation = format_conversation_history(conversation_history, max_turns=10)
    
    # First, get the raw analysis without trying to parse it
    raw_analysis_chain = analysis_prompt | llm_analysis
    
    try:
        # Run the analysis to get raw output
        raw_result = raw_analysis_chain.invoke({
            # Scenario info
            "scenario_title": scenario["title"],
            "customer_type": scenario.get("customer_type", ""),  # Changed from product_category
            "customer_objective": scenario["customer_objective"],
            "training_focus": scenario["training_focus"],
            "ideal_resolution": scenario["ideal_resolution"],
            
            # Customer info
            "customer_name": customer["name"],
            "customer_type": customer.get("customer_type", ""),  # New field
            "patience_level": customer["patience_level"],
            "politeness": customer["politeness"],
            "knowledge_level": customer["knowledge_level"],  # Changed from tech_knowledge
            "primary_concern": customer.get("primary_concern", "Account services"),  # Changed from primary_concerns
            
            # Conversation
            "conversation_history": formatted_conversation
        })
        
        # Get the text content from the result
        if hasattr(raw_result, 'content'):
            result_text = raw_result.content
        else:
            result_text = str(raw_result)
        
        print(f"Raw analysis result: {result_text[:200]}...")  # Print first 200 chars for debugging
        
        # Extract scores and suggestions from the text
        extracted_data = extract_scores_from_text(result_text)
        
        # Create a Pydantic model first (for validation)
        analysis_result = PerformanceAnalysis(
            overall_score=extracted_data["overall_score"],
            category_scores=CategoryScores(
                banking_knowledge=extracted_data["category_scores"]["banking_knowledge"],  # Changed from grammar
                customer_handling=extracted_data["category_scores"]["customer_handling"],
                policy_adherence=extracted_data["category_scores"]["policy_adherence"],  # New field
                grammar=extracted_data["category_scores"]["grammar"],
                communication=extracted_data["category_scores"]["communication"],
                customer_respect=extracted_data["category_scores"]["customer_respect"],
                solution_approach=extracted_data["category_scores"]["solution_approach"]
            ),
            improvement_suggestions=extracted_data["improvement_suggestions"],
            observations=extracted_data["observations"],
            highlight="The trainee completed the interactive banking customer service training exercise."
        )
        
        # Convert to dictionary for consistent return type
        return {
            "overall_score": analysis_result.overall_score,
            "category_scores": {
                "banking_knowledge": analysis_result.category_scores.banking_knowledge,  # Changed from grammar
                "customer_handling": analysis_result.category_scores.customer_handling,
                "policy_adherence": analysis_result.category_scores.policy_adherence,  # New field
                "grammar": analysis_result.category_scores.grammar,
                "communication": analysis_result.category_scores.communication,
                "customer_respect": analysis_result.category_scores.customer_respect,
                "solution_approach": analysis_result.category_scores.solution_approach
            },
            "improvement_suggestions": analysis_result.improvement_suggestions,
            "observations": analysis_result.observations,
            "highlight": analysis_result.highlight
        }
        
    except Exception as e:
        print(f"Error analyzing conversation: {e}")
        # If all else fails, return fallback values
        # Calculate some randomized but reasonable scores based on conversation length
        conversation_turns = len(conversation_history)
        base_score = min(60 + (conversation_turns * 3), 85)  # More turns → better score, up to 85
        variation = random.randint(-10, 10)  # Add some randomness
        overall_score = max(20, min(95, base_score + variation))  # Keep between 20-95
        
        # Vary component scores around the overall score
        banking_knowledge_score = max(30, min(95, overall_score + random.randint(-15, 15)))
        customer_score = max(30, min(95, overall_score + random.randint(-20, 10)))
        policy_score = max(30, min(95, overall_score + random.randint(-10, 15)))
                
        return {
            "overall_score": overall_score,
            "category_scores": {
                "banking_knowledge": banking_knowledge_score,  # Changed from grammar_score
                "customer_handling": customer_score,
                "policy_adherence": policy_score,  # New field
                # For backward compatibility
                "grammar": banking_knowledge_score,
                "communication": customer_score,
                "customer_respect": customer_score,
                "solution_approach": policy_score
            },
            "improvement_suggestions": [
                "Improve knowledge of specific banking products and services to provide more accurate information.",
                "Practice active listening to better understand customer concerns and address them directly.",
                "Familiarize yourself with banking regulations and policies to ensure compliance in all interactions.",
                "Develop more empathy when dealing with customers experiencing financial difficulties.",
                "Learn proper escalation procedures for different types of banking issues."
            ],
            "observations": [
                "The trainee participated in the conversation with the simulated banking customer.",
                "Banking knowledge was demonstrated during the interaction.",
                "The trainee attempted to address the customer's financial concerns.",
                "The conversation progressed through typical banking service interaction phases.",
                "The training session provided hands-on experience in banking customer service."
            ],
<<<<<<< HEAD
            "highlight": "The trainee showed engagement throughout the training exercise."
        }
=======
            "highlight": "The trainee showed engagement throughout the banking service training exercise."
        }
>>>>>>> upstream/pre_deploy
