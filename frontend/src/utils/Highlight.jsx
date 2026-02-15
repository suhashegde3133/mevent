import React from 'react';

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Highlight = ({ text = '', query = '' }) => {
  if (!query) return <>{text}</>;
  const q = String(query).toLowerCase();
  // split on the query (case-insensitive) while keeping the matches
  const parts = String(text).split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return parts.map((part, i) => (
    part.toLowerCase() === q ? (
      <mark key={i} className="search-highlight">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  ));
};

export default Highlight;
