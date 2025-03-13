import React, { useState, useRef, useEffect } from 'react';
import '../styles/ChatInterface.css';


// Component metadata for React 19
export const metadata = {
  componentName: "ChatInterface",
  description: "ChatInterface component",
};

function ChatInterface({ messages = [], onSendMessage, onApplyChanges }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    onSendMessage(input);
    setInput('');
    setIsTyping(false);
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    setInput(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Apply code changes handler
  const handleApplyChanges = (changes) => {
    if (onApplyChanges) {
      onApplyChanges(changes);
    }
  };
  
  // Format message content with code blocks
  const formatMessage = (content) => {
    if (!content) return null;
    
    // Simple regex to identify code blocks (text between triple backticks)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const codeContent = part.slice(3, -3);
        const firstLineBreak = codeContent.indexOf('\n');
        const language = firstLineBreak > 0 ? codeContent.slice(0, firstLineBreak).trim() : '';
        const code = firstLineBreak > 0 ? codeContent.slice(firstLineBreak + 1) : codeContent;
        
        return (
          <div key={index} className="code-block">
            {language && <div className="code-language">{language}</div>}
            <pre>
              <code>{code}</code>
            </pre>
            {part.includes('PROPOSED_CHANGE') && (
              <button 
                className="apply-button"
                onClick={() => handleApplyChanges(code)}
              >
                Apply Changes
              </button>
            )}
          </div>
        );
      }
      
      // Handle normal text
      return <span key={index}>{part}</span>;
    });
  };
  
  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <h3>Start a Conversation</h3>
            <p>
              Describe the feature you want to add to your project using natural language.
              For example: "Add a user authentication system" or "Create a dark mode toggle".
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.type}`}
            >
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">
                    {message.type === 'user' ? 'You' : 'Code Beast'}
                  </span>
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="message-body">
                  {formatMessage(message.content)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-container" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          placeholder="Describe the feature you want to add..."
          rows={Math.min(5, input.split('\n').length)}
        />
        <button 
          type="submit" 
          className={`send-button ${isTyping ? 'active' : ''}`}
          disabled={!isTyping}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatInterface; 