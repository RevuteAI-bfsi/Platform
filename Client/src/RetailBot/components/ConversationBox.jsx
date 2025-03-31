import React, { useRef, useEffect } from 'react';
import './ConversationBox.css';

function ConversationBox({ messages = [] }) {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // If no messages, show placeholder
  if (!messages || messages.length === 0) {
    return (
      <div className="conversatationBox-conversation-box">
        <div className="conversatationBox-empty-conversation">
          <p className="text-center text-gray-500 italic">
            The conversation will appear here. Start by speaking to the customer.
          </p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }
  
  return (
    <div className="conversatationBox-conversation-box">
      {messages.map((message, index) => (
        <div 
          key={message.id || index}
          className={`conversatationBox-message ${message.role === 'customer' ? 'conversatationBox-message-customer' : 'conversatationBox-message-user'}`}
        >
          {message.content}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ConversationBox;
