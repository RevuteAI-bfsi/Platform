"""
Retail Sales Training Conversation Manager
-----------------------------------------
This module manages the simulated customer conversations for retail sales training.
It handles persona management, response generation, and conversation analysis.

Key components:
1. LLM integration with both LangChain and direct Groq API implementations
2. Customer persona simulation with trait-based response generation
3. Product knowledge retrieval using vector search
4. Conversation analysis for sales associate feedback
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

# Product knowledge RAG system
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
import pandas as pd

# Direct Groq API integration
from groq import Groq

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
# Note: Using llama3-70b-8192 (confirmed available model) instead of llama3-2-90b-vision-preview
llm = ChatGroq(
    temperature=0.7,  # Higher temperature for more varied and natural responses
    model_name="llama3-70b-8192",  # Updated to a model that exists in Groq
    api_key=os.environ.get("GROQ_API_KEY"),
    max_tokens=100,  # Increased from 30 to allow for longer responses
    system=anti_leakage_instruction  # Added system instruction to prevent data leakage
)

# Lower temperature LLM configuration for analysis (needs more consistency)
llm_analysis = ChatGroq(
    temperature=0.1,  # Lower temperature for consistent analysis
    model_name="llama3-70b-8192",  # Updated to same model
    api_key=os.environ.get("GROQ_API_KEY")
)

# Initialize direct Groq API client as an alternative to LangChain
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Initialize embeddings for product knowledge vector database
# embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize vector store (we'll populate this when needed)
product_vectorstore = None

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
# Product Knowledge Base
# ==============================

def initialize_product_db(products_df):
    """
    Create vector database from product information for knowledge retrieval.
    
    This function processes the product dataframe to create embedding vectors
    for similarity search, enabling the bot to retrieve relevant product details.
    
    Args:
        products_df: DataFrame containing product information
        
    Returns:
        FAISS vector store containing product embeddings
    """
    global product_vectorstore
    
    # Create structured product documents for vector embedding
    product_texts = []
    product_metadatas = []
    
    for _, row in products_df.iterrows():
        # Create descriptive text for embedding - structured for better retrieval
        product_text = f"""
        Product: {row['brand']} {row['model']}
        Category: {row['category']}
        Price: ₹{row['price']}
        Features: {row['key_features']}
        Technical Specs: {row['technical_specs']}
        EMI Options: {row['emi_options']}
        Warranty: {row['warranty']}
        """
        
        # Add metadata for retrieval and filtering
        metadata = {
            "product_id": row['product_id'],
            "category": row['category'],
            "brand": row['brand'],
            "model": row['model'],
            "price": row['price']
        }
        
        product_texts.append(product_text)
        product_metadatas.append(metadata)
    
    # Create the vector store with the embeddings
    product_vectorstore = FAISS.from_texts(
        product_texts, 
        embeddings, 
        metadatas=product_metadatas
    )
    
    print(f"Product knowledge base initialized with {len(product_texts)} products")
    return product_vectorstore

# ==============================
# Prompt Templates
# ==============================

# Prompt for initial customer greeting - Updated to prevent data leakage
initial_greeting_prompt = PromptTemplate.from_template(
    """You are an Indian retail customer in a conversation with a sales associate. Here is the customer's profile:
    
    Customer traits:
    - Name: {customer_name}
    - Age: {customer_age}
    - Shopping style: {shopping_style}
    - Patience level: {patience_level}
    - Politeness: {politeness}
    - Technical knowledge: {tech_knowledge}
    - Price sensitivity: {price_sensitivity}
    - Primary concerns: {primary_concerns}
    
    Scenario: {scenario_title}
    Entry behavior: {entry_behavior}
    Shopping for: {product_category}
    
    Generate a natural greeting to the sales associate that clearly shows your personality traits.
    Give the response according to how the agent is speaking to you.
    
    ALWAYS start with a greeting like "Hello", "Hi", or "Namaste".
    
    Your response should be 15 words at most that sound like natural spoken Indian English.
    
    IMPORTANT: Provide ONLY the customer's response. DO NOT include instructions, alternatives, or metadata.
    DO NOT include phrases like "Changes subject," or "circular questions" or "Sorry, what were you saying?"
    DO NOT wrap your response in quotes or add any prefixes.
    
    Examples based on different personas:
    
    [Impatient, Direct customer]: "Hi there. I need a good smartphone under ₹20,000. Quick recommendations?"
    
    [Polite, Hesitant customer]: "Namaste. I'm looking at washing machines but I'm not sure which type would be best for my family."
    
    [Tech-savvy, Research-oriented]: "Hello! I've been researching gaming laptops with RTX graphics. Can you show me your options?"
    
    [Budget-conscious, Practical]: "Hi. I want a basic TV with good picture quality, but nothing too expensive."
    """
)

# Prompt for ongoing customer conversation responses - Updated to prevent data leakage
customer_response_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an Indian retail customer with these traits:
    
    Customer profile:
    - Name: {customer_name} ({customer_gender}, {customer_age} years old)
    - Shopping style: {shopping_style}
    - Patience: {patience_level}
    - Politeness: {politeness}
    - Tech knowledge: {tech_knowledge}
    - Price sensitivity: {price_sensitivity}
    - Primary concerns: {primary_concerns}
    
    Current shopping scenario: {scenario_title}
    - Shopping for: {product_category}
    - Objective: {customer_objective}
    
    IMPORTANT GUIDELINES:
    1. Respond in 15 words at most that feel natural and conversational
    2. Your personality should clearly reflect the traits above
    3. Speak naturally like a real person in a store
    4. Respond directly to what the sales associate just said
    5. If satisfied after a meaningful interaction, respond with "Thank you" to end the conversation
    6. Use Indian English speech patterns when appropriate
    7. Give the response according to how the agent is speaking to you
    8. Keep the previous conversation in mind and respond accordingly
    
    CRITICAL: Provide ONLY the customer's direct response. DO NOT include:
    - Metadata phrases like "Changes subject," or "Redirects conversation"
    - Alternative responses like 'But what about...' or 'I'm not sure'
    - Instructions or explanations about the response
    - DO NOT use quotes or other markup in your response
    - DO NOT number or bullet your response
    -avoid Changes subject, incomplete questions, 'Sorry, what were you saying
    
    The conversation so far:
    {conversation_history}
    """),
    ("human", "Sales Associate: {sales_associate_message}"),
])

# ==============================
# Analysis Models & Prompts
# ==============================

# Define output schemas for conversation analysis
class CategoryScores(BaseModel):
    """Updated score categories for simplified reporting"""
    grammar: int = Field(description="Score from 0-100 on grammar and language use")
    customer_handling: int = Field(description="Score from 0-100 on customer interaction skills")
    
    # Legacy fields for backward compatibility
    product_knowledge: int = Field(description="Score from 0-100 on product knowledge demonstrated")
    communication: int = Field(description="Score from 0-100 on communication skills")
    customer_respect: int = Field(description="Score from 0-100 on showing respect to customer")
    solution_approach: int = Field(description="Score from 0-100 on approach to solving customer needs")

class PerformanceAnalysis(BaseModel):
    """Updated performance analysis model with simplified metrics"""
    overall_score: int = Field(description="Overall performance score from 0-100")
    category_scores: CategoryScores = Field(description="Scores across different performance categories")
    improvement_suggestions: List[str] = Field(description="3-5 actionable improvement suggestions")
    
    # Legacy fields for backward compatibility
    observations: List[str] = Field(description="5 specific observations about the trainee's performance")
    highlight: str = Field(description="1 highlight of what the trainee did particularly well")

# Analysis prompt for evaluating sales associate performance
analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a retail sales training expert analyzing a conversation between a sales associate and a customer.

SCENARIO INFORMATION:
- Title: {scenario_title}
- Product category: {product_category}
- Customer objective: {customer_objective}
- Training focus: {training_focus}
- Ideal resolution: {ideal_resolution}

CUSTOMER INFORMATION:
- Name: {customer_name}
- Shopping style: {shopping_style}
- Patience level: {patience_level}
- Politeness: {politeness}
- Technical knowledge: {tech_knowledge}
- Primary concerns: {primary_concerns}

CONVERSATION TRANSCRIPT:
{conversation_history}

Provide your analysis with these EXACT section headers:

**Overall Score: [0-100]** 
(An overall assessment of the sales associate's performance)

**Grammar Score: [0-100]**
(Evaluation of language use and communication clarity)

**Customer Handling Score: [0-100]**
(How well the associate adapted to and respected customer needs)

**Specific Improvement Suggestions:**
1. **[First suggestion title]**: [Details]
2. **[Second suggestion title]**: [Details]
3. **[Third suggestion title]**: [Details]

Be honest but constructive in your feedback. Focus on practical improvements.
""")
])

# Output parser for analysis - converts LLM output to structured data
analysis_parser = JsonOutputParser(pydantic_object=PerformanceAnalysis)

# ==============================
# Conversation Utility Functions
# ==============================

def detect_misgendering(message: str, customer: Dict[str, Any]) -> bool:
    """
    Detect if the sales associate is using incorrect gender terms for the customer.
    
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
    Determine what type of question the user/sales associate is asking.
    
    This helps the bot respond appropriately to common question types
    without always needing to call the LLM, improving reliability.
    
    Args:
        message: The user's message text
        
    Returns:
        String identifier of the question type
    """
    message = message.lower()
    
    # Check for personal questions about the bot/customer
    if any(phrase in message for phrase in ["your name", "what is your name", "who are you", "may i know your name"]):
        return "ASKING_NAME"
    
    if any(phrase in message for phrase in ["how are you", "how do you do", "how is your day"]):
        return "ASKING_WELLBEING"
        
    # Check for greetings
    if any(greeting in message for greeting in ["hello", "hi", "namaste", "greetings"]):
        return "GREETING"
    
    # Check for product questions
    if any(phrase in message for phrase in ["price", "cost", "how much", "expensive"]):
        return "ASKING_PRICE"
        
    if any(phrase in message for phrase in ["feature", "specification", "what can it do"]):
        return "ASKING_FEATURES"
        
    if any(phrase in message for phrase in ["warranty", "guarantee"]):
        return "ASKING_WARRANTY"
    
    # Default case
    return "GENERAL_QUESTION"

def generate_alternative_response():
    """
    Generate alternative responses when the LLM fails or produces unsuitable output.
    
    These responses are varied based on different persona types to maintain
    a natural conversation flow even in error conditions.
    
    Returns:
        A natural-sounding fallback response string
    """
    # These responses will be more varied based on different personas
    impatient_responses = [
        "Look, I don't have all day. What's your best option?",
        "Just tell me the price. Is there a discount?",
        "Can we speed this up? What's special about this one?"
    ]
    
    polite_responses = [
        "I appreciate your help. Could you tell me more about the features?",
        "That's interesting. What about warranty options?",
        "I see. And how does this compare to other models?"
    ]
    
    budget_conscious = [
        "That's quite expensive. Do you have something more affordable?",
        "What about EMI options? How much per month?",
        "Any ongoing sales or discounts I should know about?"
    ]
    
    tech_savvy = [
        "What's the processor speed and RAM configuration?",
        "How does the camera compare to the previous model?",
        "I read about some issues with the battery life. Is that fixed?"
    ]
    
    # Combine all response types for variety
    all_responses = impatient_responses + polite_responses + budget_conscious + tech_savvy
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
    tech_knowledge = customer.get("tech_knowledge", "Medium").lower()
    politeness = customer.get("politeness", "Medium").lower()
    price_sensitivity = customer.get("price_sensitivity", "Medium").lower()
    
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
        # Add impatience indicators
        impatience_markers = ["Quickly,", "Just tell me", "Come on,", "Let's move on,"]
        if random.random() < 0.4 and not any(marker in modified_response for marker in impatience_markers):
            modified_response = f"{random.choice(impatience_markers)} {modified_response}"
    
    # Apply technical knowledge transformations
    if tech_knowledge == "high" and "technical" in response.lower():
        # Add technical jargon for tech-savvy customers
        technical_terms = ["specs", "configuration", "processor", "bandwidth", "resolution"]
        if not any(term in modified_response.lower() for term in technical_terms) and random.random() < 0.5:
            modified_response = modified_response.replace("it", random.choice(technical_terms))
    
    # Apply price sensitivity transformations
    if price_sensitivity == "high" and random.random() < 0.4:
        price_phrases = ["Is that the best price?", "Any discounts?", "Seems expensive.", "Can you do better on price?"]
        if not any(phrase in modified_response for phrase in price_phrases):
            modified_response = f"{modified_response} {random.choice(price_phrases)}"
    
    # Don't make changes every time - sometimes keep the original for naturalness
    return modified_response if random.random() < 0.7 else response

def retrieve_product_knowledge(query: str, product_category: str) -> str:
    """
    Retrieve relevant product information based on conversation context.
    
    This function uses vector similarity search to find product information
    that's relevant to the user's query within the specified category.
    
    Args:
        query: The user's message or query
        product_category: Product category to focus search on
        
    Returns:
        Formatted product information string
    """
    if product_vectorstore is None:
        return "No product information available."
    
    # Enhance query with product category for better results
    enhanced_query = f"{product_category}: {query}"
    
    # Retrieve relevant documents
    docs = product_vectorstore.similarity_search(enhanced_query, k=3)
    
    if not docs:
        return "No specific product information found."
    
    # Format retrieved information
    product_info = "\n\n".join([doc.page_content for doc in docs])
    return product_info

def format_conversation_history(history: List[Dict[str, str]], max_turns=8) -> str:
    """
    Format conversation history to maintain better context for LLM prompt.
    
    Increased from 4 to 8 turns to maintain better conversation coherence.
    
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
            formatted += f"Sales Associate: {message}\n"
        else:
            formatted += f"Customer: {message}\n"
    return formatted

def is_conversation_ending(user_message: str, conversation_history: List[Dict[str, str]]) -> bool:
    """
    Determine if the conversation should naturally end based on context.
    
    This function identifies when a customer is ready to purchase or when
    the conversation has reached a natural conclusion point.
    
    Args:
        user_message: The user's latest message
        conversation_history: List of previous conversation messages
        
    Returns:
        Boolean indicating if the conversation should end
    """
    # Keywords that might indicate a satisfied customer ready to purchase
    satisfaction_indicators = [
        "buy", "purchase", "take it", "get it", "decide", "interested", 
        "will go with", "sounds good", "perfect", "exactly what I need"
    ]
    
    # Check for explicit closing indicators in user message
    closing_indicators = ["would you like to complete the purchase", "shall i process your order", 
                         "would you like to buy", "ready to check out"]
    
    # Minimum conversation length before allowing natural ending
    min_turns = 6  # Increased from 4 to ensure more meaningful exchanges
    
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
        return "What about the price?" if not is_initial else "Hi! Looking for some help here."
    
    # Ensure initial messages start with a greeting
    if is_initial and not any(greeting in response.lower() for greeting in ["hello", "hi", "namaste"]):
        response = f"Hello! {response}"
    
    # Limit response length to max 50 words (increased from 10)
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
        "tech_knowledge": customer.get("tech_knowledge", "Medium"),
        "politeness": customer.get("politeness", "Medium"),
        "price_sensitivity": customer.get("price_sensitivity", "Medium"),
        "shopping_style": customer.get("shopping_style", "Balanced")
    }
    
    # Only keep extreme trait values (High/Low) as distinctive
    for trait, value in trait_values.items():
        if value.lower() in ["high", "low", "very high", "very low"]:
            distinctive_traits.append(trait)
    
    # If we have too many distinctive traits, keep only the most extreme ones
    if len(distinctive_traits) > 3:
        # Prioritize certain traits based on scenario
        scenario_category = customer.get("scenario_category", "").lower()
        
        # For tech products, prioritize tech knowledge
        if "electronics" in scenario_category or "tech" in scenario_category:
            if "tech_knowledge" in distinctive_traits:
                distinctive_traits = ["tech_knowledge"] + [t for t in distinctive_traits if t != "tech_knowledge"][:2]
        
        # For luxury items, prioritize price sensitivity
        elif "luxury" in scenario_category or "premium" in scenario_category:
            if "price_sensitivity" in distinctive_traits:
                distinctive_traits = ["price_sensitivity"] + [t for t in distinctive_traits if t != "price_sensitivity"][:2]
        
        # Otherwise, prioritize patience and politeness
        else:
            priority_order = ["patience_level", "politeness", "shopping_style", "price_sensitivity", "tech_knowledge"]
            distinctive_traits = sorted(distinctive_traits, key=lambda x: priority_order.index(x) if x in priority_order else 999)[:3]
    
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
    Generate a response from the simulated customer using LangChain.
    
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
            return f"Actually, it's {gender_term}. Could you show me some {scenario['product_category']} options?"
        elif patience == "low":
            return f"I'm a {gender_term}, not a {'sir' if gender_term=='maam' else 'maam'}. Now about those {scenario['product_category']}?"
        else:
            return f"It's {gender_term}, not {'sir' if gender_term=='maam' else 'maam'}. I'm looking for {scenario['product_category']}."
    
    # If this is the initial greeting (no history or user message)
    if not conversation_history and not user_message:
        # Use the initial greeting prompt
        greeting_chain = initial_greeting_prompt | llm
        
        try:
            greeting_result = greeting_chain.invoke({
                "customer_name": customer["name"],
                "customer_age": customer["age"],
                "shopping_style": customer["shopping_style"],
                "patience_level": customer["patience_level"],
                "politeness": customer["politeness"],
                "tech_knowledge": customer["tech_knowledge"],
                "price_sensitivity": customer.get("price_sensitivity", "Medium"),
                "primary_concerns": customer.get("primary_concerns", "Quality and price"),
                "scenario_title": scenario["title"],
                "entry_behavior": scenario["entry_behavior"],
                "product_category": scenario["product_category"]
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
            fallbacks = [
                f"Hello! I'm looking for a {scenario['product_category']}.",
                f"Hi there! Need information about these products.",
                f"Namaste! Do you have {scenario['product_category']}?"
            ]
            return random.choice(fallbacks)
    
    # Check if conversation should end
    if is_conversation_ending(user_message, conversation_history):
        return "Thank you. I'll take it."
    
    # NEW: First check if user is asking a common question type that can be handled directly
    if user_message:
        question_type = detect_question_type(user_message)
        print(f"[DEBUG] Detected question type: {question_type}")
        
        # Handle different question types with appropriate responses
        if question_type == "ASKING_NAME":
            patience = customer.get("patience_level", "Medium").lower()
            
            if patience == "low":
                return f"I'm {customer['name']}. Now, can we get back to the {scenario['product_category']}?"
            else:
                return f"My name is {customer['name']}. I'm looking for a {scenario['product_category']}."
            
        if question_type == "GREETING":
            return f"Hello! As I mentioned, I'm interested in buying a {scenario['product_category']}. Can you help me?"
        
        if question_type == "ASKING_WELLBEING":
            politeness = customer.get("politeness", "Medium").lower()
            
            if politeness == "high":
                return "I'm doing well, thank you for asking. Now about the products we were discussing..."
            else:
                return "I'm here to shop, not chat. What can you tell me about your products?"
    
    # For ongoing conversation, retrieve relevant product knowledge if needed
    product_knowledge = ""
    if user_message and product_vectorstore is not None:
        if any(keyword in user_message.lower() for keyword in ["price", "feature", "spec", "emi", "option", "compare"]):
            product_knowledge = retrieve_product_knowledge(user_message, scenario["product_category"])
    
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
            "customer_gender": customer["gender"],
            "customer_age": customer["age"],
            "shopping_style": customer["shopping_style"],
            "patience_level": customer["patience_level"],
            "politeness": customer["politeness"],
            "tech_knowledge": customer["tech_knowledge"],
            "price_sensitivity": customer.get("price_sensitivity", "Medium"),
            "primary_concerns": customer.get("primary_concerns", "Quality and price"),
            
            # Scenario info
            "scenario_title": scenario["title"],
            "product_category": scenario["product_category"],
            "customer_objective": scenario["customer_objective"],
            
            # Context
            "conversation_history": formatted_history,
            "sales_associate_message": user_message,
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
        
        # Even with errors, handle basic questions without falling back to random responses
        if user_message:
            question_type = detect_question_type(user_message)
            
            # Provide direct responses for common questions even when the LLM fails
            if question_type == "ASKING_NAME":
                return f"I'm {customer['name']}. I'm interested in {scenario['product_category']}."
                
            if question_type == "GREETING":
                return f"Hello there. I'm looking for {scenario['product_category']}."
                
            if question_type == "ASKING_PRICE":
                return "What's the price range for this model?"
                
            if question_type == "ASKING_FEATURES":
                return "Can you tell me about the main features?"
                
            if question_type == "ASKING_WARRANTY":
                return "What kind of warranty does it come with?"
        
        # Context-aware fallbacks based on conversation stage
        if len(conversation_history) <= 2:
            # Early conversation fallbacks - focused on initial inquiries
            early_fallbacks = [
                f"Do you have {scenario['product_category']} in different price ranges?",
                f"What brands of {scenario['product_category']} do you carry?",
                f"I'm looking for a {scenario['product_category']} with good quality.",
                f"Can you recommend a {scenario['product_category']} for me?"
            ]
            return random.choice(early_fallbacks)
        else:
            # Later conversation fallbacks - more specific questions
            later_fallbacks = [
                "What about the warranty terms?",
                "How does the EMI option work?",
                "Do you have this in other colors?",
                "Is this the latest model?",
                "Are there any ongoing discounts?"
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
            return f"Actually, it's {gender_term}. Could you show me some {scenario['product_category']} options?"
        else:
            return f"It's {gender_term}, not {'sir' if gender_term=='maam' else 'maam'}. I'm looking for {scenario['product_category']}."
    
    # If this is the initial greeting (no history or user message)
    if not conversation_history and not user_message:
        system_prompt = f"""You are simulating an Indian retail customer named {customer['name']}.
            
Customer traits:
- Age: {customer['age']}
- Shopping style: {customer['shopping_style']}
- Patience level: {customer['patience_level']}
- Politeness: {customer['politeness']}
- Technical knowledge: {customer['tech_knowledge']}
- Price sensitivity: {customer.get('price_sensitivity', 'Medium')}

Scenario: {scenario['title']}
Entry behavior: {scenario['entry_behavior']}
Shopping for: {scenario['product_category']}

Generate a natural greeting to the sales associate that clearly shows your personality traits.
ALWAYS start with a greeting like "Hello", "Hi", or "Namaste".
Keep it short, just 1-2 sentences that sound natural for spoken Indian English.

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
            fallbacks = [
                f"Hello! I'm looking for a {scenario['product_category']}.",
                f"Hi there! Need information about these products.",
                f"Namaste! Do you have {scenario['product_category']}?"
            ]
            return random.choice(fallbacks)
    
    # Check if asking a direct question we can handle without the LLM
    # if user_message:
    #     question_type = detect_question_type(user_message)
        
    #     # Handle common questions directly
    #     if question_type == "ASKING_NAME":
    #         return f"I'm {customer['name']}. I'm looking for a {scenario['product_category']}."
            
    #     if question_type == "GREETING":
    #         return f"Hello! As I mentioned, I'm interested in buying a {scenario['product_category']}."
    
    # Check if conversation should end
    if is_conversation_ending(user_message, conversation_history):
        return "Thank you. I'll take it."
    
    # Format conversation history for the prompt
    formatted_history = format_conversation_history(conversation_history)
    
    # Create system prompt with anti-leakage instructions
    system_prompt = f"""You are simulating an Indian retail customer with these traits:
    
Customer profile:
- Name: {customer['name']} ({customer.get('gender', 'Male/Female')}, {customer['age']} years old)
- Shopping style: {customer['shopping_style']}
- Patience: {customer['patience_level']}
- Politeness: {customer['politeness']}
- Tech knowledge: {customer['tech_knowledge']}
- Price sensitivity: {customer.get('price_sensitivity', 'Medium')}
- Primary concerns: {customer.get('primary_concerns', 'Quality and price')}

Current shopping scenario: {scenario['title']}
- Shopping for: {scenario['product_category']}
- Objective: {scenario['customer_objective']}

IMPORTANT GUIDELINES:
1. Respond in 1-3 short sentences that feel natural and conversational
2. Your personality should clearly reflect the traits above
3. Speak naturally like a real person in a store
4. Respond directly to what the sales associate just said
5. If satisfied after a meaningful interaction, respond with "Thank you" to end the conversation
6. Use Indian English speech patterns when appropriate

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
            {"role": "user", "content": f"Sales Associate: {user_message}"}
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
        
        # Context-aware fallbacks based on conversation stage
        if len(conversation_history) <= 2:
            # Early conversation fallbacks
            early_fallbacks = [
                f"Do you have {scenario['product_category']} in different price ranges?",
                f"What brands of {scenario['product_category']} do you carry?",
                f"I'm looking for a {scenario['product_category']} with good quality.",
                f"Can you recommend a {scenario['product_category']} for me?"
            ]
            return random.choice(early_fallbacks)
        else:
            # Later conversation fallbacks
            later_fallbacks = [
                "What about the warranty terms?",
                "How does the EMI option work?",
                "Do you have this in other colors?",
                "Is this the latest model?",
                "Are there any ongoing discounts?"
            ]
            return random.choice(later_fallbacks)

def extract_scores_from_text(text):
    """
    Extract scores and suggestions from text when JSON parsing fails.
    """
    # Default values if extraction fails
    data = {
        "overall_score": 50,
        "category_scores": {
            "grammar": 50,
            "customer_handling": 50,
            "communication": 50,
            "customer_respect": 50,
            "product_knowledge": 50,
            "solution_approach": 50
        },
        "improvement_suggestions": [],
        "observations": [],
        "highlight": "Performance review completed."
    }
    
    # Extract overall score
    overall_match = re.search(r"Overall Score:?\s*(\d+)", text, re.IGNORECASE)
    if overall_match:
        data["overall_score"] = int(overall_match.group(1))
    
    # Extract grammar score
    grammar_match = re.search(r"Grammar Score:?\s*(\d+)", text, re.IGNORECASE)
    if grammar_match:
        score = int(grammar_match.group(1))
        data["category_scores"]["grammar"] = score
        data["category_scores"]["communication"] = score  # For compatibility
    
    # Extract customer handling score
    customer_match = re.search(r"Customer (Handling|Respect) Score:?\s*(\d+)", text, re.IGNORECASE)
    if customer_match:
        score = int(customer_match.group(2))
        data["category_scores"]["customer_handling"] = score
        data["category_scores"]["customer_respect"] = score  # For compatibility
    
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
    
    This function evaluates the sales associate's performance in the conversation
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
            "product_category": scenario["product_category"],
            "customer_objective": scenario["customer_objective"],
            "training_focus": scenario["training_focus"],
            "ideal_resolution": scenario["ideal_resolution"],
            
            # Customer info
            "customer_name": customer["name"],
            "shopping_style": customer["shopping_style"],
            "patience_level": customer["patience_level"],
            "politeness": customer["politeness"],
            "tech_knowledge": customer["tech_knowledge"],
            "primary_concerns": customer.get("primary_concerns", "Quality and price"),
            
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
                grammar=extracted_data["category_scores"]["grammar"],
                customer_handling=extracted_data["category_scores"]["customer_handling"],
                communication=extracted_data["category_scores"]["communication"],
                customer_respect=extracted_data["category_scores"]["customer_respect"],
                product_knowledge=extracted_data["category_scores"]["product_knowledge"],
                solution_approach=extracted_data["category_scores"]["solution_approach"]
            ),
            improvement_suggestions=extracted_data["improvement_suggestions"],
            observations=extracted_data["observations"],
            highlight="The trainee completed the interactive sales training exercise."
        )
        
        # Convert to dictionary for consistent return type
        return {
            "overall_score": analysis_result.overall_score,
            "category_scores": {
                "grammar": analysis_result.category_scores.grammar,
                "customer_handling": analysis_result.category_scores.customer_handling,
                "communication": analysis_result.category_scores.communication,
                "customer_respect": analysis_result.category_scores.customer_respect,
                "product_knowledge": analysis_result.category_scores.product_knowledge,
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
        grammar_score = max(30, min(95, overall_score + random.randint(-15, 15)))
        customer_score = max(30, min(95, overall_score + random.randint(-20, 10)))
                
        return {
            "overall_score": overall_score,
            "category_scores": {
                "grammar": grammar_score,
                "customer_handling": customer_score,
                # For backward compatibility
                "communication": grammar_score,
                "customer_respect": customer_score,
                "product_knowledge": overall_score - 5,
                "solution_approach": overall_score - 10
            },
            "improvement_suggestions": [
                "Focus on clearer communication to better address customer needs.",
                "Practice active listening to understand customer concerns more effectively.",
                "Work on adapting your communication style to match the customer's personality.",
                "Develop more structured questioning techniques to identify customer requirements."
            ],
            "observations": [
                "The trainee participated in the conversation with the simulated customer.",
                "Communication skills were demonstrated during the interaction.",
                "The trainee attempted to address the customer's needs.",
                "The conversation progressed through typical retail interaction phases.",
                "The training session provided hands-on experience in customer service."
            ],
            "highlight": "The trainee showed engagement throughout the training exercise."
        }
