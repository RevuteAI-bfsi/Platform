"""
Retail Sales Training API
------------------------
This FastAPI app provides endpoints for retail sales training simulations with
virtual customers. It manages training scenarios, customer personas, and conversations
to help sales associates practice their skills in a realistic environment.

Key features:
1. Multiple training scenarios with varying difficulty
2. Diverse customer personas with different traits
3. Realistic conversation simulation using LLM
4. Performance analysis and feedback
"""
from pymongo import MongoClient
from datetime import datetime
from fastapi import Query
from retail_schema import UserRetailTraining, ScenarioProgress, AttemptModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import os

# MongoDB connection string
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb+srv://RevuteAI:admin123@revuteaicluster.12vsf.mongodb.net/?retryWrites=true&w=majority&appName=RevuteAICluster")

# Global database variables
mongo_client = None
db = None

# Import conversation manager components
from conversation_manager import (
    generate_customer_response,
    generate_customer_response_direct,  # New direct implementation
    analyze_conversation,
    initialize_product_db,
    active_conversations,
    simplify_persona
)

# Toggle between direct API and LangChain implementation
# This allows easy switching between the two approaches
USE_DIRECT_API = os.environ.get("USE_DIRECT_API", "True").lower() == "true"

app = FastAPI(title="Retail Sales Training API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
CUSTOMERS_CSV = "data/customers.csv"
SCENARIOS_CSV = "data/scenarios.csv"
TRAITS_CSV = "data/traits.csv"
PRODUCTS_CSV = "data/products.csv"

# Data storage (loaded on startup)
customers_df = None
scenarios_df = None
traits_df = None
products_df = None

# ==============================
# Pydantic Data Models
# ==============================

class Scenario(BaseModel):
    """Basic scenario information model"""
    scenario_id: str
    title: str
    difficulty: str
    product_category: str
    customer_objective: str
    scenario_description: str

class ScenarioDetail(Scenario):
    """Detailed scenario information with additional fields"""
    entry_behavior: str
    specific_interests: str
    exit_condition: str
    training_focus: str
    ideal_resolution: str

class StartConversationRequest(BaseModel):
    """Request model for starting a new conversation"""
    scenario_id: str
    user_id: Optional[str] = None

class StartConversationResponse(BaseModel):
    """Response model with conversation details"""
    conversation_id: str
    customer_name: str
    customer_avatar: str
    customer_info: Dict[str, Any]
    scenario_info: Dict[str, Any]
    initial_message: str

class MessageRequest(BaseModel):
    """Request model for sending a message"""
    conversation_id: str
    message: str
    user_id: Optional[str] = None

class MessageResponse(BaseModel):
    """Response model with customer's reply"""
    customer_message: str

# ==============================
# App Lifecycle Events
# ==============================

@app.on_event("startup")
async def startup_event():
    """
    Load data files and initialize product knowledge base and MongoDB on startup.
    
    This ensures all necessary data is loaded before handling requests,
    initializes the product vector database for knowledge retrieval, and
    establishes a connection with MongoDB.
    """
    global customers_df, scenarios_df, traits_df, products_df, mongo_client, db    
    print("Loading data files...")
    try:
        customers_df = pd.read_csv(CUSTOMERS_CSV)
        scenarios_df = pd.read_csv(SCENARIOS_CSV)
        traits_df = pd.read_csv(TRAITS_CSV)
        products_df = pd.read_csv(PRODUCTS_CSV)
        
        print(f"Loaded {len(customers_df)} customer personas")
        print(f"Loaded {len(scenarios_df)} scenarios")
        print(f"Loaded {len(traits_df)} behavioral traits")
        print(f"Loaded {len(products_df)} products")
        
        # Initialize product knowledge base for retrieval
        initialize_product_db(products_df)
        
    except Exception as e:
        print(f"Error loading data: {e}")
    
    # MongoDB connection setup
    try:
        print("Connecting to MongoDB...")
        mongo_client = MongoClient(MONGODB_URI)
        
        # Test connection with a ping
        mongo_client.admin.command('ping')
        print("MongoDB connection successful")
        
        # Connect to the 'test' database specifically
        db = mongo_client.get_database("test")
        print(f"Connected to 'test' database")
        
        # List existing collections
        existing_collections = db.list_collection_names()
        print(f"Existing collections in 'test' database: {existing_collections}")
        
        # Create collection if it doesn't exist
        if "user_retail_training" not in existing_collections:
            db.create_collection("user_retail_training")
            print("Successfully created 'user_retail_training' collection")
        else:
            print("Collection 'user_retail_training' already exists")
        
        # Verify the collection was created
        updated_collections = db.list_collection_names()
        print(f"Updated collections list: {updated_collections}")
        
        # Verify we can insert a test document (and remove it)
        test_result = db.user_retail_training.insert_one({"test": True, "timestamp": datetime.now()})
        print(f"Test document inserted with ID: {test_result.inserted_id}")
        
        # Clean up the test document
        db.user_retail_training.delete_one({"_id": test_result.inserted_id})
        print("Test document removed - MongoDB setup complete")
        
    except Exception as e:
        print(f"MongoDB setup error: {e}")
        print("WARNING: Application will run but database features will be unavailable")

# ==============================
# Debug Endpoints
# ==============================

@app.get("/debug/mongo-status")
async def debug_mongo_status():
    """Debug endpoint to check MongoDB connection status"""
    if not mongo_client or not db:
        return {
            "status": "error", 
            "message": "MongoDB connection not established",
            "client_exists": mongo_client is not None,
            "db_exists": db is not None
        }
    
    try:
        # Test MongoDB connection
        mongo_client.admin.command('ping')
        
        # Get collection information
        collections = db.list_collection_names()
        has_collection = "user_retail_training" in collections
        
        # Count documents if collection exists
        doc_count = db.user_retail_training.count_documents({}) if has_collection else 0
        
        return {
            "status": "ok",
            "database": db.name,
            "collections": collections,
            "has_user_retail_training": has_collection,
            "document_count": doc_count
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/debug/test-insert")
async def test_insert_document():
    """Test inserting a document into MongoDB"""
    if not db:
        return {"status": "error", "message": "MongoDB connection not established"}
    
    try:
        # Create a test document
        test_doc = {
            "test_id": str(uuid.uuid4()),
            "timestamp": datetime.now(),
            "type": "debug_document"
        }
        
        # Insert the document
        result = db.user_retail_training.insert_one(test_doc)
        
        return {
            "status": "success",
            "message": "Test document inserted successfully",
            "document_id": str(result.inserted_id)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to insert document: {str(e)}"
        }

# ==============================
# API Routes
# ==============================

@app.get("/")
async def root():
    """Root endpoint to check if the API is running"""
    return {"message": "Retail Sales Training API is running"}

@app.get("/scenarios", response_model=List[Scenario])
async def get_scenarios():
    """
    Get all available training scenarios.
    
    Returns a list of scenarios with basic information that can be used
    to select a scenario for training.
    """
    if scenarios_df is None:
        raise HTTPException(status_code=500, detail="Scenario data not loaded")
    
    scenarios = []
    for _, row in scenarios_df.iterrows():
        scenarios.append(Scenario(
            scenario_id=row["scenario_id"],
            title=row["title"],
            difficulty=row["difficulty"],
            product_category=row["product_category"],
            customer_objective=row["customer_objective"],
            scenario_description=row["scenario_description"]
        ))
    return scenarios

@app.get("/scenarios/{scenario_id}", response_model=ScenarioDetail)
async def get_scenario(scenario_id: str):
    """
    Get detailed information about a specific scenario.
    
    Provides comprehensive details about a selected scenario to help the
    sales associate prepare for the training session.
    
    Args:
        scenario_id: ID of the scenario to retrieve
        
    Returns:
        Detailed scenario information
    """
    if scenarios_df is None:
        raise HTTPException(status_code=500, detail="Scenario data not loaded")
    
    scenario = scenarios_df[scenarios_df["scenario_id"] == scenario_id]
    if scenario.empty:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    row = scenario.iloc[0]
    return ScenarioDetail(
        scenario_id=row["scenario_id"],
        title=row["title"],
        difficulty=row["difficulty"],
        product_category=row["product_category"],
        customer_objective=row["customer_objective"],
        entry_behavior=row["entry_behavior"],
        specific_interests=row["specific_interests"],
        exit_condition=row["exit_condition"],
        training_focus=row["training_focus"],
        scenario_description=row["scenario_description"],
        ideal_resolution=row["ideal_resolution"]
    )

@app.post("/conversation/start", response_model=StartConversationResponse)
async def start_conversation(request: StartConversationRequest):
    """
    Start a new training conversation with a selected scenario.
    
    This creates a new conversation with a randomized customer persona
    based on the selected scenario, generating an initial customer greeting.
    
    Args:
        request: Contains scenario_id to use
        
    Returns:
        Conversation details including ID, customer info, and initial message
    """
    if scenarios_df is None or customers_df is None or traits_df is None:
        raise HTTPException(status_code=500, detail="Required data not loaded")
    
    scenario_id = request.scenario_id
    
    # Find the scenario
    scenario = scenarios_df[scenarios_df["scenario_id"] == scenario_id]
    if scenario.empty:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Select an appropriate customer persona
    # In a more sophisticated system, you could match customer to scenario
    customer_row = customers_df.sample(1).iloc[0]
    
    # Select random behavioral traits
    trait_row = traits_df.sample(1).iloc[0]
    
    # Extract data
    scenario_data = scenario.iloc[0].to_dict()
    customer_data = customer_row.to_dict()
    trait_data = trait_row.to_dict()
    
    # Simplify complex personas to focus on key traits
    # This improves response consistency by focusing on 2-3 distinctive traits
    simplified_customer_data = simplify_persona(customer_data)
    
    # Generate conversation ID
    conversation_id = str(uuid.uuid4())
    
    # Choose which implementation to use based on configuration
    # This allows easy switching between direct API and LangChain
    if USE_DIRECT_API:
        print("Using direct Groq API implementation")
        initial_message = generate_customer_response_direct(
            simplified_customer_data,
            scenario_data,
            trait_data,
            [],  # Empty conversation history
            ""   # No user message yet
        )
    else:
        print("Using LangChain implementation")
        initial_message = generate_customer_response(
            simplified_customer_data,
            scenario_data,
            trait_data,
            [],  # Empty conversation history
            ""   # No user message yet
        )
    
    # Store conversation context for future reference
    active_conversations[conversation_id] = {
        "scenario_id": scenario_id,
        "user_id": request.user_id,  # Store user_id in the conversation
        "scenario_data": scenario_data,
        "customer_data": simplified_customer_data,
        "trait_data": trait_data,
        "use_direct_api": USE_DIRECT_API,
        "history": [{"role": "customer", "message": initial_message}],
        "start_time": datetime.now().isoformat()
    }
    
    # Return response with initial message
    return StartConversationResponse(
        conversation_id=conversation_id,
        customer_name=simplified_customer_data["name"],
        customer_avatar=simplified_customer_data["avatar_type"],
        customer_info={
            "shopping_style": simplified_customer_data["shopping_style"],
            "patience_level": simplified_customer_data["patience_level"],
            "tech_knowledge": simplified_customer_data["tech_knowledge"],
            "primary_concerns": simplified_customer_data.get("primary_concerns", "Quality and price")
        },
        scenario_info={
            "title": scenario_data["title"],
            "customer_objective": scenario_data["customer_objective"],
            "specific_interests": scenario_data["specific_interests"]
        },
        initial_message=initial_message
    )

@app.post("/conversation/message", response_model=MessageResponse)
async def send_message(request: MessageRequest):
    """
    Send a message in an ongoing conversation and get customer response.
    
    This endpoint processes a sales associate's message to the customer
    and generates an appropriate customer response based on the scenario,
    persona, and conversation history.
    
    Args:
        request: Contains conversation_id and message text
        
    Returns:
        The customer's response to the message
    """
    conversation_id = request.conversation_id
    user_message = request.message
    
    # Verify conversation exists
    if conversation_id not in active_conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get conversation data
    conversation = active_conversations[conversation_id]
    
    # Add user message to history
    conversation["history"].append({"role": "user", "message": user_message})
    
    # Use the same implementation method that was used to start the conversation
    use_direct_api = conversation.get("use_direct_api", USE_DIRECT_API)
    
    # Generate customer response using the appropriate method
    if use_direct_api:
        print(f"[{conversation_id}] Using direct API for response")
        customer_message = generate_customer_response_direct(
            conversation["customer_data"],
            conversation["scenario_data"],
            conversation["trait_data"],
            conversation["history"],
            user_message
        )
    else:
        print(f"[{conversation_id}] Using LangChain for response")
        customer_message = generate_customer_response(
            conversation["customer_data"],
            conversation["scenario_data"],
            conversation["trait_data"],
            conversation["history"],
            user_message
        )
    
    # Add customer response to conversation history
    conversation["history"].append({"role": "customer", "message": customer_message})
    
    # Update conversation in storage
    active_conversations[conversation_id] = conversation
    
    # Debug output for tracking
    print(f"[{conversation_id}] User: {user_message}")
    print(f"[{conversation_id}] Customer: {customer_message}")
    
    return MessageResponse(customer_message=customer_message)

@app.get("/analysis/{conversation_id}")
async def get_analysis(conversation_id: str, userId: str = Query(None)):
    """
    Analyze the conversation and generate performance feedback.
    
    This endpoint evaluates the sales associate's performance and stores
    the results in MongoDB if a user ID is provided.
    
    Args:
        conversation_id: ID of the conversation to analyze
        userId: Optional user ID for storing progress
        
    Returns:
        Analysis results including scores and feedback
    """
    if conversation_id not in active_conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get conversation data
    conversation = active_conversations[conversation_id]
    
    # Analyze conversation using LLM
    analysis = analyze_conversation(
        conversation["customer_data"],
        conversation["scenario_data"],
        conversation["history"]
    )
    
    print(f"Analysis type: {type(analysis)}")
    print(f"Analysis content (preview): {str(analysis)[:100]}...")
    
    # Get user_id either from query param or from conversation data
    user_id = None
    if userId and userId != "undefined":
        user_id = userId
    else:
        user_id = conversation.get("user_id")
        
      # Don't proceed with DB operations if we still have invalid user_id
    if not user_id or user_id == "undefined":
        print("Warning: Invalid user_id, skipping MongoDB storage")
        return analysis
    
    # Store in MongoDB if user_id is provided and MongoDB is connected
    if db is not None and user_id:
        try:
            # Current timestamp
            current_time = datetime.now()
            
            # Get scenario details
            scenario_id = conversation["scenario_id"]
            scenario_title = conversation["scenario_data"]["title"]
            
            # Extract data from analysis object
            # This handles both dictionary-like objects and class instances
            try:
                # Try dictionary-style access first
                overall_score = analysis["overall_score"]
                grammar_score = analysis["category_scores"]["grammar"]
                customer_handling_score = analysis["category_scores"]["customer_handling"]
                improvement_suggestions = analysis["improvement_suggestions"]
            except (TypeError, KeyError):
                # Fall back to attribute access
                overall_score = getattr(analysis, "overall_score", 0)
                category_scores = getattr(analysis, "category_scores", {})
                
                # Handle category_scores as either dict or object
                if hasattr(category_scores, "grammar"):
                    grammar_score = category_scores.grammar
                    customer_handling_score = category_scores.customer_handling
                else:
                    try:
                        grammar_score = category_scores.get("grammar", 0)
                        customer_handling_score = category_scores.get("customer_handling", 0)
                    except AttributeError:
                        # If all else fails, default to 0
                        grammar_score = 0
                        customer_handling_score = 0
                
                improvement_suggestions = getattr(analysis, "improvement_suggestions", [])
            
            print(f"Creating attempt with scores - overall: {overall_score}, grammar: {grammar_score}, customer: {customer_handling_score}")
            
            # Create attempt record with the extracted data
            attempt = AttemptModel(
                timestamp=current_time,
                conversation_id=conversation_id,
                overall_score=overall_score,
                grammar_score=grammar_score,
                customer_handling_score=customer_handling_score,
                improvement_suggestions=improvement_suggestions
            )
            
            # Try to update an existing scenario in the user's document
            result = db.user_retail_training.update_one(
                {
                    "user_id": user_id,
                    "scenarios.scenario_id": scenario_id
                },
                {
                    "$set": {
                        "last_updated": current_time,
                        "scenarios.$.completed": True,
                        "scenarios.$.last_attempt_date": current_time,
                        "scenarios.$.latest_score": overall_score,
                    },
                    "$inc": {
                        "scenarios.$.total_attempts": 1
                    },
                    # Set best_score to max of current and new score
                    "$max": {
                        "scenarios.$.best_score": overall_score
                    },
                    # Add new attempt to beginning of attempts array, limit to 5
                    "$push": {
                        "scenarios.$.attempts": {
                            "$each": [attempt.dict()],
                            "$position": 0,
                            "$slice": 5  # Keep only the 5 most recent attempts
                        }
                    }
                }
            )
            
            # If no document was matched, this is the first time for this scenario
            if result.matched_count == 0:
                # Try to update the user document by adding a new scenario
                user_exists = db.user_retail_training.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {"last_updated": current_time},
                        "$push": {
                            "scenarios": {
                                "scenario_id": scenario_id,
                                "scenario_title": scenario_title,
                                "completed": True,
                                "total_attempts": 1,
                                "first_attempt_date": current_time,
                                "last_attempt_date": current_time,
                                "best_score": overall_score,
                                "latest_score": overall_score,
                                "attempts": [attempt.dict()]
                            }
                        }
                    }
                )
                
                # If user document doesn't exist yet, create a new one
                if user_exists.matched_count == 0:
                    new_user_training = UserRetailTraining(
                        user_id=user_id,
                        last_updated=current_time,
                        scenarios=[
                            ScenarioProgress(
                                scenario_id=scenario_id,
                                scenario_title=scenario_title,
                                completed=True,
                                total_attempts=1,
                                first_attempt_date=current_time,
                                last_attempt_date=current_time,
                                best_score=overall_score,
                                latest_score=overall_score,
                                attempts=[attempt]
                            )
                        ]
                    )
                    db.user_retail_training.insert_one(new_user_training.dict(by_alias=True))
            
            print(f"User progress saved to MongoDB for user {user_id}")
            
        except Exception as e:
            print(f"Error storing analysis in MongoDB: {e}")
    
    return analysis

@app.get("/user-progress/{user_id}")
async def get_user_progress(user_id: str):
    """
    Get user's progress across all scenarios.
    
    This endpoint retrieves the user's training progress document and 
    adds completion status for all available scenarios.
    
    Args:
        user_id: User's unique identifier
        
    Returns:
        A list of all scenarios with their completion status for this user
    """
    if db is None:
         raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Get all available scenarios
        all_scenarios = await get_scenarios()
        
        # Get user's progress document
        user_progress = db.user_retail_training.find_one({"user_id": user_id})
        
        # If user has no progress yet, return all scenarios as incomplete
        if not user_progress:
            return [
                {
                    "scenario_id": scenario.scenario_id,
                    "title": scenario.title,
                    "difficulty": scenario.difficulty, 
                    "completed": False,
                    "best_score": None,
                    "attempts": 0
                }
                for scenario in all_scenarios
            ]
        
        # Create a lookup dictionary of the user's scenario progress
        user_scenarios = {s["scenario_id"]: s for s in user_progress.get("scenarios", [])}
        
        # Map each scenario to its completion status
        scenario_progress = []
        for scenario in all_scenarios:
            user_scenario = user_scenarios.get(scenario.scenario_id)
            
            scenario_progress.append({
                "scenario_id": scenario.scenario_id,
                "title": scenario.title,
                "difficulty": scenario.difficulty,
                "completed": user_scenario["completed"] if user_scenario else False,
                "best_score": user_scenario["best_score"] if user_scenario else None,
                "attempts": user_scenario["total_attempts"] if user_scenario else 0,
                "last_attempt_date": user_scenario["last_attempt_date"] if user_scenario else None
            })
        
        return scenario_progress
        
    except Exception as e:
        print(f"Error fetching user progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user progress")
    
@app.get("/user-progress/{user_id}/scenario/{scenario_id}")
async def get_scenario_progress(user_id: str, scenario_id: str):
    """
    Get detailed progress for a specific scenario.
    
    This endpoint retrieves detailed information about a user's progress
    on a specific scenario, including attempt history.
    
    Args:
        user_id: User's unique identifier
        scenario_id: Scenario identifier
        
    Returns:
        Detailed progress information for the scenario
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Get the scenario details first
        scenario_details = await get_scenario(scenario_id)
        
        # Query for the specific scenario in the user's progress
        user_scenario = db.user_retail_training.find_one(
            {
                "user_id": user_id,
                "scenarios.scenario_id": scenario_id
            },
            {"scenarios.$": 1}  # Get only the matching scenario
        )
        
        # If user hasn't attempted this scenario yet
        if not user_scenario or "scenarios" not in user_scenario or not user_scenario["scenarios"]:
            return {
                "scenario_id": scenario_id,
                "title": scenario_details.title,
                "completed": False,
                "total_attempts": 0,
                "first_attempt_date": None,
                "last_attempt_date": None,
                "best_score": None,
                "latest_score": None,
                "attempts": []
            }
        
        # Return the scenario progress
        progress = user_scenario["scenarios"][0]
        return progress
        
    except Exception as e:
        print(f"Error fetching scenario progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scenario progress")
        
def ensure_user_document(user_id: str):
    """
    Ensure user document exists in the database.
    Creates it if it doesn't exist yet.
    """
    if not db:
        return False
        
    try:
        # Check if user document exists
        user_doc = db.user_retail_training.find_one({"user_id": user_id})
        
        # If not, create it
        if not user_doc:
            new_user = UserRetailTraining(
                user_id=user_id,
                last_updated=datetime.now(),
                scenarios=[]
            )
            db.user_retail_training.insert_one(new_user.dict(by_alias=True))
            return True
            
        return True
    except Exception as e:
        print(f"Error ensuring user document: {e}")
        return False    

# Start the application if running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)