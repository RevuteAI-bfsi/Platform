import React, { useState, useEffect, useRef } from "react";
import { IoReturnUpBackOutline, IoCall } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import product1_avatar from "../../images/product1_avatar.svg";
import product2_avatar from "../../images/product2_avatar.svg";
import product3_avatar from "../../images/product3_avatar.svg";
import product4_avatar from "../../images/product4_avatar.svg";
import product5_avatar from "../../images/product5_avatar.svg";
import FeaturedCard from "../../images/FeaturedCard.jpg";
import businessImg from "../../images/defaultavatar.svg";
import ProductRolePlay from "./ProductRoleplay.jsx"; // Import the new component
import "./TrainingPage.css";

const TrainingPage = () => {
  const [currentView, setCurrentView] = useState("info");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedScenario, setSelectedScenario] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [avatar, setAvatar] = useState("");
  const [conversation, setConversation] = useState([]);
  const [generalReadGuidelines, setGeneralReadGuidelines] = useState(false);
  const [generalReadyToProceed, setGeneralReadyToProceed] = useState(false);
  const [productReadGuidelines, setProductReadGuidelines] = useState(false);
  const [productReadyToProceed, setProductReadyToProceed] = useState(false);

  // Call-related state
  const [inCall, setInCall] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [context, setContext] = useState("");
  const [chatHistory, setChatHistory] = useState("");
  const [behaviorType, setBehaviorType] = useState("Polite Customer");
  const [behavior, setBehavior] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  
  // Scenario tracking
  const [usedScenarios, setUsedScenarios] = useState([]);
  const [totalScenarios, setTotalScenarios] = useState(10);
  const [remainingScenarios, setRemainingScenarios] = useState(10);

  const recognitionRef = useRef(null);
  const messageEndRef = useRef(null);

  const productList = ["Product 1", "Product 2", "Product 3", "Product 4", "Product 5"];
  const scenarioOptions = ["Prospect Lead", "Non-Prospect Lead", "Angry Customer", "Happy Customer", "Sad Customer"];
  const avatarMapping = {
    "Product 1": { "Prospect Lead": product1_avatar, "Non-Prospect Lead": product1_avatar, "Angry Customer": product1_avatar, "Happy Customer": product1_avatar, "Sad Customer": product1_avatar },
    "Product 2": { "Prospect Lead": product2_avatar, "Non-Prospect Lead": product2_avatar, "Angry Customer": product2_avatar, "Happy Customer": product2_avatar, "Sad Customer": product2_avatar },
    "Product 3": { "Prospect Lead": product3_avatar, "Non-Prospect Lead": product3_avatar, "Angry Customer": product3_avatar, "Happy Customer": product3_avatar, "Sad Customer": product3_avatar },
    "Product 4": { "Prospect Lead": product4_avatar, "Non-Prospect Lead": product4_avatar, "Angry Customer": product4_avatar, "Happy Customer": product4_avatar, "Sad Customer": product4_avatar },
    "Product 5": { "Prospect Lead": product5_avatar, "Non-Prospect Lead": product5_avatar, "Angry Customer": product5_avatar, "Happy Customer": product5_avatar, "Sad Customer": product5_avatar }
  };

  // Get total scenario count on component mount
  useEffect(() => {
    fetchTotalScenarios();
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputMessage((prev) => prev + finalTranscript + ' ');
        }
        setInterimTranscript(interimTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event);
        setMicOn(false);
        setIsTranscribing(false);
      };
      
      recognitionRef.current.onend = () => {
        setMicOn(false);
        setIsTranscribing(false);
        setInterimTranscript("");
      };
    } else {
      console.warn("Speech Recognition not supported in this browser");
    }
    
    // Clean up
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        if (micOn) {
          recognitionRef.current.stop();
        }
      }
    };
  }, []);

  // Keyboard shortcut for microphone toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+M to toggle microphone
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [micOn]);

  // Fetch total number of scenarios from the backend
  const fetchTotalScenarios = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/get_total_scenarios");
      if (response.ok) {
        const data = await response.json();
        setTotalScenarios(data.total);
        setRemainingScenarios(data.total - usedScenarios.length);
        console.log("Fetched total scenarios:", data);
      } else {
        console.error("Failed to fetch scenarios:", response.status);
      }
    } catch (error) {
      console.error("Error fetching scenarios:", error);
    }
  };

  // Function to speak text using SpeechSynthesis
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on behavior type
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to pick a voice appropriate for the behavior type
        utterance.voice = voices.find((voice) =>
          behaviorType.includes("Polite") ? voice.name.includes("Female") : voice.name.includes("Male")
        ) || voices[0];
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text to Speech not supported in this browser");
    }
  };

  // Start a call with the backend
  const startCall = async () => {
    try {
      // Play ringing sound
      const ringAudio = new Audio("/phone-pick-up.mp3");
      await ringAudio.load();
      ringAudio.play();
      
      // Call the backend API
      const response = await fetch("http://localhost:5000/api/start_call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usedScenarios: usedScenarios })
      });
      
      if (!response.ok) {
        throw new Error("Failed to start call");
      }
      
      const data = await response.json();
      
      // Update state with API response data
      setTimeout(() => {
        ringAudio.pause();
        ringAudio.currentTime = 0;
        
        setContext(data.context);
        setBehavior(data.behavior || "");
        setBehaviorType(data.behaviorType || "Polite Customer");
        
        // Add first customer message
        setMessages([{ sender: "Customer", text: data.customerGreeting }]);
        setChatHistory(`Customer: ${data.customerGreeting}\n`);
        
        // Add this scenario to used scenarios
        if (data.selectedScenario) {
          const newUsedScenarios = [...usedScenarios, data.selectedScenario];
          setUsedScenarios(newUsedScenarios);
          setRemainingScenarios(totalScenarios - newUsedScenarios.length);
        }
        
        // Start the call
        setInCall(true);
        
        // Speak the greeting
        speakText(data.customerGreeting);
      }, 3000); // 3 second delay to simulate ringing
      
      return data;
    } catch (error) {
      console.error("Error starting call:", error);
      alert(`Error starting call: ${error.message}`);
      return null;
    }
  };

  // Send a message to the backend
  const sendMessageAPI = async (message) => {
    try {
      const response = await fetch("http://localhost:5000/api/send_message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          context: context,
          chatHistory: chatHistory,
          behavior: behavior
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  };

  // Toggle microphone on/off
  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    
    if (micOn) {
      recognitionRef.current.stop();
      setMicOn(false);
      setIsTranscribing(false);
      setInterimTranscript("");
    } else {
      try {
        recognitionRef.current.start();
        setMicOn(true);
        setIsTranscribing(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
      }
    }
  };

  // Handle sending a message (text or voice)
  const handleSendMessage = async (userText) => {
    const messageToSend = userText || inputMessage;
    if (messageToSend.trim() === "") return;
    
    // If mic is on, turn it off
    if (micOn) {
      recognitionRef.current.stop();
      setMicOn(false);
      setIsTranscribing(false);
      setInterimTranscript("");
    }
    
    // Add agent message to UI
    setMessages(prev => [...prev, { sender: "Agent", text: messageToSend }]);
    
    // Update chat history
    const updatedChatHistory = chatHistory + `Agent: ${messageToSend}\n`;
    setChatHistory(updatedChatHistory);
    
    // Clear input field
    setInputMessage("");
    
    try {
      // Call API to get customer response
      const responseData = await sendMessageAPI(messageToSend);
      
      if (responseData) {
        const botReply = responseData.response;
        
        // Add customer response to UI
        setMessages(prev => [...prev, { sender: "Customer", text: botReply }]);
        
        // Update chat history
        const newChatHistory = updatedChatHistory + `Customer: ${botReply}\n`;
        setChatHistory(newChatHistory);
        
        // Speak the customer's response
        speakText(botReply);
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
    }
  };

  // Handle ending the call
  const handleEndCall = () => {
    // Stop any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Stop any ongoing speech recognition
    if (recognitionRef.current && micOn) {
      recognitionRef.current.stop();
      setMicOn(false);
      setIsTranscribing(false);
      setInterimTranscript("");
    }
    
    alert("Call has been ended.");
    
    // Reset call state
    setInCall(false);
    setMessages([]);
    setInputMessage("");
    setContext("");
    setChatHistory("");
    setBehavior("");
    
    // Check if all scenarios are completed
    if (usedScenarios.length >= totalScenarios) {
      alert("Congratulations! You have completed all available scenarios. The scenarios will now reset.");
      setUsedScenarios([]);
      setRemainingScenarios(totalScenarios);
    }
  };

  // Handle making a call
  const handleMakeCall = async () => {
    const startCallData = await startCall();
    if (!startCallData) {
      alert("Failed to start call. Please try again.");
    }
  };

  // Reset the entire training session
  const resetTraining = () => {
    // Reset product/scenario selection
    setSelectedProduct("");
    setSelectedScenario("");
    setCallStatus("");
    setAvatar("");
    setConversation([]);
    setGeneralReadGuidelines(false);
    setGeneralReadyToProceed(false);
    setProductReadGuidelines(false);
    setProductReadyToProceed(false);
    
    // Reset call state
    setInCall(false);
    setMessages([]);
    setInputMessage("");
    setContext("");
    setChatHistory("");
    setBehaviorType("Polite Customer");
    setBehavior("");
    
    // If mic is on, turn it off
    if (micOn && recognitionRef.current) {
      recognitionRef.current.stop();
      setMicOn(false);
      setIsTranscribing(false);
      setInterimTranscript("");
    }
    
    // Return to info view
    setCurrentView("info");
  };

  // Function to redirect to the demo page
  const redirectToDemoRoleplay = () => {
    window.open("https://azure-4sk4.onrender.com", "_blank");
  };

  // Info View Component
  const InfoView = () => (
    <div className="trainingPageinfo-container">
      <div className="TrainingPage-mainContainer-Introsection">
        <div className="TrainingPage-mainContainer-IntroSection-CenterDiv">
          <h1 className="intro-title">Welcome to Advanced Telecommunication Training</h1>
          <p className="intro-subtitle">
            Enhance your telecalling skills with our interactive role-playing modules. Practice real-life scenarios and improve your communication abilities.
          </p>
          <div className="intro-buttons">
            <button className="btn-general-telecalling" onClick={() => setCurrentView("general")}>
              Telecalling RolePlay
            </button>
            <button className="btn-product-telecalling" onClick={() => setCurrentView("banking")}>
              Banking RolePlay
            </button>
            <button className="btn-demo-telecalling" onClick={redirectToDemoRoleplay}>
              Demo RolePlay
            </button>
          </div>
        </div>
      </div>
      <div className="TrainingPage-containerFor-Features">
        <div className="TrainingPage-FeaturesSection">
          <div className="TrainingPage-leftFeatureSection">
            <div className="TrainingPage-featuredCard">
              <h2>Interactive Training Modules</h2>
              <p>
                Practice telecalling with realistic roleplay scenarios, including different customer types like happy, angry, and sad customers.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Easy Module Selection</h2>
              <p>
                Simply click on a module to start training, with clear guidelines provided before beginning.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Call Simulation Experience</h2>
              <p>
                The system mimics a real phone call with ringing sounds and a customer avatar appearing on the screen.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Voice-Based Interaction</h2>
              <p>
                Speak directly, and the system converts your speech into text, processes it, and provides a voice response.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Realistic Customer Responses</h2>
              <p>
                The customer's voice tone changes dynamically based on their emotions, creating a more immersive experience.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Engaging Visuals & Animations</h2>
              <p>
                Avatars and smooth animations make the training feel more real and interactive.
              </p>
            </div>
            <div className="TrainingPage-featuredCard">
              <h2>Step-by-Step Guidance</h2>
              <p>
                Receive scenario descriptions and guidelines before starting to ensure you know what to do.
              </p>
            </div>
          </div>
          <div className="TrainingPage-rightFeatureImageSection">
            <img src={FeaturedCard} alt="Training Feature Preview" />
          </div>
        </div>
      </div>
      <div className="Encourage-wrapper">
        <div className="Encourage-tiltLayer">
          <div className="Encourage-contentContainer">
            <div className="Encourage-topRow">
              <h2>Ready to enhance your telecommunication skills?</h2>
              <p>
                Join our interactive training module now to improve your telecalling abilities.
              </p>
            </div>
            <button onClick={() => setCurrentView("general")}>Start Training</button>
          </div>
        </div>
      </div>
    </div>
  );

  // General Module Component
  const GeneralModule = () => (
    <div className="telecommunication-module general">
      <button className="telecommunication-module__back" onClick={resetTraining}>Back</button>
      <h2 className="telecommunication-module__title">General Telecalling Module</h2>
      <div className="telecommunication-module__description">
        <p className="telecommunication-module__description-text">
          Enhance your communication skills with a simulated customer call experience. This module offers diverse interactions without focusing on any specific product, ensuring well-rounded practice.
        </p>
      </div>
      <div className="telecommunication-module__content">
        <div className="telecommunication-module__left">
          <div className="telecommunication-module__acknowledgements">
            <label>
              <input type="checkbox" checked={generalReadGuidelines} onChange={() => setGeneralReadGuidelines(!generalReadGuidelines)} /> I have read the guidelines.
            </label>
            <label>
              <input type="checkbox" checked={generalReadyToProceed} onChange={() => setGeneralReadyToProceed(!generalReadyToProceed)} /> I am ready to proceed.
            </label>
          </div>
          <button id="start-practice" onClick={() => {
              setCallStatus("inProgress");
              setConversation([]);
              setCurrentView("Telecalling-call"); // Switch to integrated telecalling view
            }} disabled={!(generalReadGuidelines && generalReadyToProceed)}>
            Start Practice
          </button>
        </div>
        <div className="telecommunication-module__guidelines">
          <h3>Guidelines</h3>
          <ul>
            <li>Listen attentively to understand the customer's needs.</li>
            <li>Maintain a professional and respectful tone.</li>
            <li>Communicate clearly and concisely.</li>
            <li>Stay calm and composed, even in challenging situations.</li>
            <li>Use this session to enhance your communication skills.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Product Module Component
  const ProductModule = () => (
    <div className="telecommunication-module product">
      <button className="telecommunication-module__back" onClick={resetTraining}>Back</button>
      <h2 className="telecommunication-module__title">Specialized Role-Play Module</h2>
      <div className="telecommunication-module__description">
        <p>
          Select a product and a matching customer persona for targeted role-play scenarios. Gain focused, product-specific communication practice.
        </p>
      </div>
      <div className="telecommunication-module__product-list">
        <h3>Product List</h3>
        <p>Select which product you want:</p>
        <div className="telecommunication-module__products">
          {productList.map((product, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedProduct(product);
                setSelectedScenario("");
              }}
              className={`telecommunication-module__product ${selectedProduct === product ? "active" : ""}`}
            >
              {product}
            </button>
          ))}
        </div>
        {selectedProduct && (
          <div className="telecommunication-module__scenario">
            <h3>Select a Scenario for {selectedProduct}</h3>
            <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}>
              <option value="">-- Select a Scenario --</option>
              {scenarioOptions.map((scenario, idx) => (
                <option key={idx} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </div>
        )}
        {selectedProduct && selectedScenario && (
          <button id="start-practice-product" onClick={() => {
              const avatarSrc = avatarMapping[selectedProduct]?.[selectedScenario] || "";
              setCallStatus("inProgress");
              setAvatar(avatarSrc);
              setConversation([]);
              setCurrentView("call");
            }} disabled={!(productReadGuidelines && productReadyToProceed)}>
            Start Practice
          </button>
        )}
      </div>
      <div className="telecommunication-module__guidelines">
        <h3>Guidelines</h3>
        <ul>
          <li>Listen carefully to the customer's concerns.</li>
          <li>Adapt your tone based on the customer's emotions.</li>
          <li>Be ready with product-specific information.</li>
          <li>Stay calm and professional.</li>
          <li>Use these simulations to sharpen your product knowledge.</li>
        </ul>
      </div>
      <div className="telecommunication-module__acknowledgements">
        <label>
          <input type="checkbox" checked={productReadGuidelines} onChange={() => setProductReadGuidelines(!productReadGuidelines)} /> I have read the guidelines.
        </label>
        <label>
          <input type="checkbox" checked={productReadyToProceed} onChange={() => setProductReadyToProceed(!productReadyToProceed)} /> I am ready to proceed.
        </label>
      </div>
    </div>
  );

  // Call View Component
  const CallView = () => (
    <div className="call-view">
      <header className="call-view__header">
        <IoReturnUpBackOutline onClick={resetTraining} size={30} className="call-view__back-button" />
      </header>
      {callStatus === "inProgress" && (
        <main className="call-view__main">
          <div className="call-view__left-section">
            <div className="call-view__avatar-container">
              {avatar && <img src={avatar} alt="Avatar" className="call-view__avatar" />}
            </div>
            <div className="call-view__extra-controls">
              <button className="call-view__call-button" onClick={toggleMic}>
                <IoCall size={30} />
              </button>
            </div>
          </div>
          <div className="call-view__right-section">
            <div className="call-view__chat-container">
              <div className="call-view__transcript">
                {conversation.map((msg, idx) => (
                  <div key={idx} className={msg.type === "user" ? "call-view__user-message" : "call-view__bot-message"}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="call-view__input-bar">
                <input type="text" className="call-view__text-input" placeholder="Type your message..." />
                <button className={`call-view__mic-button ${micOn ? "is-listening" : ""}`} onClick={toggleMic}>
                  <FaMicrophone size={20} />
                  <div className="call-view__mic-animation" />
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );

  // Integrated Telecalling View Component
  const IntegratedTelecallingView = () => {
    if (!inCall) {
      return (
        <div className="telecalling-afterCallView">
          <div className="telecalling-view__not-in-call">
            <IoReturnUpBackOutline onClick={resetTraining} size={30} className="call-view__back-button" />
            <div className="telecalling-view__not-in-call-box">
              <h2 className="telecalling-view__not-in-call-title">Welcome to Call Center Training!</h2>
              <p className="telecalling-view__welcome-text">
                You are just one step away from making a call. Click "Make Call" below to start your training session.
              </p>
              <div className="telecalling-view__scenario-counter">
                Remaining scenarios: {remainingScenarios}/{totalScenarios}
              </div>
              <button className="telecalling-view__make-call-button" onClick={handleMakeCall}>
                Make Call
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="container-telecalling">
        <div className="leftPanel-telecalling">
          <img src={businessImg} alt="User" className="userImage" />
          <div className="customerType">
            <strong>Customer Type:</strong>
            <div className={behaviorType.includes("Polite") ? "telecalling-view__behavior-text polite" : "telecalling-view__behavior-text rude"}>
              {behaviorType}
            </div>
            <div className="telecalling-view__instruction-text">Press Ctrl+M to toggle mic</div>
            <div className="telecalling-view__scenario-counter">
              Scenarios: {remainingScenarios}/{totalScenarios}
            </div>
          </div>
        </div>
        <div className="conversation">
          <div className="chatScreen">
            {messages.map((msg, index) => (
              <div key={index} className={`telecalling-view__chat-message ${msg.sender === "Customer" ? "customer" : "agent"}`}>
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
          <div className="telecalling-view__chat-controls">
            <div className="telecalling-view__input-container">
              <input
                type="text"
                placeholder={micOn ? "Listening..." : "Type your message..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                className="telecalling-view__chat-input"
              />
              {isTranscribing && interimTranscript && (
                <div className="telecalling-view__interim-transcript">
                  {interimTranscript}
                </div>
              )}
            </div>
            <button onClick={() => handleSendMessage()} className="sendButton">Send</button>
            <button 
              className={`micButton ${micOn ? "micOn" : "micOff"}`} 
              onClick={toggleMic}
              title={micOn ? "Stop Listening" : "Start Listening"}
            >
              {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
          </div>
          <button onClick={handleEndCall} className="endCall">End Call</button>
        </div>
      </div>
    );
  };

  // Main Component Rendering
  return (
    <div className="TrainingPage-mainContainer">
      {currentView === "info" && <InfoView />}
      {currentView === "general" && <GeneralModule />}
      {currentView === "product" && <ProductModule />}
      {currentView === "call" && <CallView />}
      {currentView === "Telecalling-call" && <IntegratedTelecallingView />}
      {currentView === "banking" && <ProductRolePlay onBack={resetTraining} />}
    </div>
  );
};

export default TrainingPage;