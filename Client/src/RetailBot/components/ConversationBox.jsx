import React, { useRef, useEffect } from 'react';
import './ConversationBox.css';
import '../common.css'

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
      <div className="conversation-box">
        <div className="empty-conversation">
          <p className="text-center text-gray-500 italic">
            The conversation will appear here. Start by speaking to the customer.
          </p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }
  
  return (
    <div className="conversation-box">
      {messages.map((message, index) => (
        <div 
          key={message.id || index}
          className={`message ${message.role === 'customer' ? 'message-customer' : 'message-user'}`}
        >
          {message.content}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ConversationBox;