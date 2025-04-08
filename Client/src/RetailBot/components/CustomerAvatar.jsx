import React from 'react';
import PropTypes from 'prop-types';
import './CustomAvatar.css';
// import '../common.css';

// Component for displaying customer avatar
function CustomerAvatar({ name, type = 'default', speaking = false }) {
  // Get initials from name with better handling
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part[0])
      .slice(0, 3) // Limit to 3 initials for better display
      .join('')
      .toUpperCase();
  };
  
  // Map avatar types to appropriate styles/colors with professional color palette
  const getAvatarStyle = (type) => {
    const avatarStyles = {
      businessman: { backgroundColor: '#2c3e50', color: 'white' },
      professional_woman: { backgroundColor: '#34495e', color: 'white' },
      tech_guy: { backgroundColor: '#2980b9', color: 'white' },
      casual_woman: { backgroundColor: '#e74c3c', color: 'white' },
      older_man: { backgroundColor: '#d35400', color: 'white' },
      elegant_woman: { backgroundColor: '#8e44ad', color: 'white' },
      frustrated_man: { backgroundColor: '#c0392b', color: 'white' },
      young_woman: { backgroundColor: '#16a085', color: 'white' },
      family_man: { backgroundColor: '#27ae60', color: 'white' },
      assertive_woman: { backgroundColor: '#9b59b6', color: 'white' },
      default: { backgroundColor: '#3498db', color: 'white' }
    };
    
    return avatarStyles[type] || avatarStyles.default;
  };
  
  const avatarStyle = getAvatarStyle(type);
  
  return (
    <div className="avatar" title={name || 'Customer'}>
      <div 
        className={`avatar-circle ${speaking ? 'speaking' : ''}`}
        style={avatarStyle}
        role="img"
        aria-label={`Avatar for ${name || 'Customer'}`}
      >
        {getInitials(name)}
      </div>
      <div className="avatar-name">{name || 'Customer'}</div>
    </div>
  );
}

CustomerAvatar.propTypes = {
  name: PropTypes.string,
  type: PropTypes.oneOf([
    'businessman',
    'professional_woman',
    'tech_guy',
    'casual_woman',
    'older_man',
    'elegant_woman',
    'frustrated_man',
    'young_woman',
    'family_man',
    'assertive_woman',
    'default'
  ]),
  speaking: PropTypes.bool
};

export default CustomerAvatar;