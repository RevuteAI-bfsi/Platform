import React from 'react';
import './ContentDisplay.css';

const ContentDisplay = ({ content }) => {
  if (!content) {
    return <div className="content-display">No content available</div>;
  }

  const renderContentItem = (item, index) => {
    switch (item.type) {
      case 'text':
        return <p key={index} className="content-text">{item.value}</p>;
      
      case 'subheading':
        return <h3 key={index} className="content-subheading">{item.value}</h3>;
      
      case 'list':
        return (
          <ul key={index} className="content-list">
            {item.items.map((listItem, i) => (
              <li key={i}>{listItem}</li>
            ))}
          </ul>
        );
      
      case 'sublist':
        return (
          <div key={index} className="content-sublist">
            <h4>{item.heading}</h4>
            <ul>
              {item.items.map((listItem, i) => (
                <li key={i}>{listItem}</li>
              ))}
            </ul>
          </div>
        );
      
      case 'example':
        return <div key={index} className="content-example">{item.value}</div>;
      
      case 'note':
        return <div key={index} className="content-note">{item.value}</div>;
      
      default:
        return null;
    }
  };

  return (
    <div className="content-display">
      <div className="content-header">
        <h1>{content.title}</h1>
        {content.introduction && <p className="content-intro">{content.introduction}</p>}
      </div>

      <div className="content-sections">
        {content.sections.map((section, index) => (
          <div key={index} className="content-section" id={section.id}>
            <h2 className="section-title">{section.title}</h2>
            <div className="section-content">
              {section.content.map(renderContentItem)}
            </div>
          </div>
        ))}
      </div>

      {content.exercises && (
        <div className="content-exercises">
          <h2>Exercises</h2>
          {content.exercises.map((exercise, index) => (
            <div key={index} className="exercise">
              <h3>{exercise.title}</h3>
              <p className="exercise-instructions">{exercise.instructions}</p>
              <div className="exercise-questions">
                {exercise.questions.map((question, qIndex) => (
                  <div key={qIndex} className="exercise-question">
                    <p dangerouslySetInnerHTML={{ __html: question.question.replace(/\*(.*?)\*/g, '<strong>$1</strong>') }}></p>
                    <div className="answer-container">
                      <button 
                        className="show-answer-btn"
                        onClick={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'block';
                        }}
                      >
                        Show Answer
                      </button>
                      <div className="answer" style={{ display: 'none' }}>
                        <strong>Answer:</strong> {question.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;