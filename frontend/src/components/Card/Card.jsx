import React from 'react';
import './Card.scss';

const Card = ({ 
  title, 
  value, 
  icon, 
  color = '#6366f1', 
  subtitle,
  onClick,
  className = '' 
}) => {
  // Map a handful of known theme colors to modifier classes. If an unknown
  // color is supplied we'll fall back to the default indigo variant.
  const colorClassMap = {
    '#ec4899': 'card--rose',
    '#8b5cf6': 'card--violet',
    '#6366f1': 'card--indigo',
    '#10b981': 'card--green'
  };

  const colorClass = colorClassMap[color] || 'card--indigo';

  return (
    <div 
      className={`card ${onClick ? 'card--clickable' : ''} ${colorClass} ${className}`}
      onClick={onClick}
    >
      <div className="card__content">
        <div className="card__header">
          <h3 className="card__title">{title}</h3>
          {icon && <div className="card__icon">{icon}</div>}
        </div>
        <div className="card__value">{value}</div>
      </div>
    </div>
  );
};

export default Card;
