import React from 'react';
import './CustomAvatar.css';
import '../common.css';



// Component for displaying customer avatar
function CustomerAvatar({ name, type = 'default', speaking = false }) {
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  // Map avatar types to appropriate styles/colors
  const getAvatarStyle = (type) => {
    const avatarStyles = {
      businessman: { backgroundColor: '#3498db', color: 'white' },
      professional_woman: { backgroundColor: '#9b59b6', color: 'white' },
      tech_guy: { backgroundColor: '#2ecc71', color: 'white' },
      casual_woman: { backgroundColor: '#e74c3c', color: 'white' },
      older_man: { backgroundColor: '#f39c12', color: 'white' },
      elegant_woman: { backgroundColor: '#d35400', color: 'white' },
      frustrated_man: { backgroundColor: '#c0392b', color: 'white' },
      young_woman: { backgroundColor: '#1abc9c', color: 'white' },
      family_man: { backgroundColor: '#16a085', color: 'white' },
      assertive_woman: { backgroundColor: '#8e44ad', color: 'white' },
      default: { backgroundColor: '#0057b7', color: 'white' }
    };
    
    return avatarStyles[type] || avatarStyles.default;
  };
  
  const avatarStyle = getAvatarStyle(type);
  
  return (
    <div className="avatar">
      <div 
        className={`avatar-circle ${speaking ? 'speaking' : ''}`}
        style={avatarStyle}
      >
        {getInitials(name)}
      </div>
      <div className="avatar-name">{name || 'Customer'}</div>
    </div>
  );
}

export default CustomerAvatar;