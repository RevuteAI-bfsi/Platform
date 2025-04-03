import React, { useRef, useEffect } from 'react';
import './ConversationBox.css';
// import '../common.css';

function ConversationBox({ messages = [] }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Scroll when messages change with a small delay to ensure DOM updates
  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollToBottom();
    }, 150);
    
    return () => clearTimeout(scrollTimer);
  }, [messages]);
  
  // Manual check for height overflow (extra protection)
  useEffect(() => {
    // Add resize observer to adjust for dynamic content
    const resizeObserver = new ResizeObserver(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // If no messages, show placeholder
  if (!messages || messages.length === 0) {
    return (
      <div className="chat-outer-container">
        <div className="chat-scroll-container" ref={containerRef}>
          <div className="empty-conversation">
            <p className="text-center text-gray-500 italic">
              The conversation will appear here. Start by speaking to the customer.
            </p>
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-outer-container">
      <div className="chat-scroll-container" ref={containerRef}>
        {messages.map((message, index) => (
          <div 
            key={message.id || index}
            className={`message-row ${message.role === 'customer' ? 'customer-row' : 'user-row'}`}
          >
            <div className={`message-bubble ${message.role === 'customer' ? 'customer-bubble' : 'user-bubble'}`}>
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="scroll-anchor" />
      </div>
    </div>
  );
}

export default ConversationBox;