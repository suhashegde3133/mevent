import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaPlus, 
  FaStickyNote, 
  FaListUl, 
  FaThumbtack, 
  FaArchive, 
  FaTrash, 
  FaTimes,
  FaCheck,
  FaEllipsisV,
  FaPalette,
  FaEdit,
  FaSearch,
  FaInbox,
  FaUndo
} from 'react-icons/fa';
import { apiHelper } from '../utils/api';
import { useLocation } from 'react-router-dom';
import useConfirm from '../hooks/useConfirm';
import './Note.scss';

const COLORS = [
  { id: '#ffffff', name: 'Default', class: 'color-default' },
  { id: '#fff9c4', name: 'Yellow', class: 'color-yellow' },
  { id: '#f3e5f5', name: 'Purple', class: 'color-purple' },
  { id: '#e3f2fd', name: 'Blue', class: 'color-blue' },
  { id: '#e8f5e9', name: 'Green', class: 'color-green' },
  { id: '#fce4ec', name: 'Pink', class: 'color-pink' },
  { id: '#fff3e0', name: 'Orange', class: 'color-orange' },
  { id: '#e0f7fa', name: 'Teal', class: 'color-teal' }
];

const Note = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New note state
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteType, setNewNoteType] = useState('text');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    checklist: [],
    color: '#ffffff'
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Edit note state
  const [editingNote, setEditingNote] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editChecklistItem, setEditChecklistItem] = useState('');

  // UI state
  const [activeMenu, setActiveMenu] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);

  const confirm = useConfirm();
  const location = useLocation();

  useEffect(() => {
    if (location?.state?.openAdd) {
      setShowNewNote(true);
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiHelper.get(`/notes?archived=${showArchived}`);
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Filter notes by search term
  const filteredNotes = notes.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    const matchesTitle = note.title?.toLowerCase().includes(searchLower);
    const matchesContent = note.content?.toLowerCase().includes(searchLower);
    const matchesChecklist = note.checklist?.some(item => 
      item.text?.toLowerCase().includes(searchLower)
    );
    return matchesTitle || matchesContent || matchesChecklist;
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  // Create new note
  const handleCreateNote = async () => {
    const finalChecklist = [...newNote.checklist];
    if (newNoteType === 'checklist' && newChecklistItem.trim()) {
      finalChecklist.push({ text: newChecklistItem.trim(), completed: false });
    }

    if (!newNote.title.trim() && !newNote.content.trim() && finalChecklist.length === 0) {
      setShowNewNote(false);
      return;
    }

    try {
      const noteData = {
        title: newNote.title,
        type: newNoteType,
        color: newNote.color,
        ...(newNoteType === 'text' 
          ? { content: newNote.content }
          : { checklist: finalChecklist }
        )
      };

      await apiHelper.post('/notes', noteData);
      fetchNotes();
      resetNewNote();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const resetNewNote = () => {
    setShowNewNote(false);
    setNewNoteType('text');
    setNewNote({
      title: '',
      content: '',
      checklist: [],
      color: '#ffffff'
    });
    setNewChecklistItem('');
  };

  // Add checklist item to new note
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setNewNote(prev => ({
        ...prev,
        checklist: [...prev.checklist, { text: newChecklistItem.trim(), completed: false }]
      }));
      setNewChecklistItem('');
    }
  };

  // Remove checklist item from new note
  const removeChecklistItem = (index) => {
    setNewNote(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  // Toggle pin
  const handleTogglePin = async (noteId) => {
    try {
      await apiHelper.patch(`/notes/${noteId}/pin`);
      fetchNotes();
      setActiveMenu(null);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Toggle archive
  const handleToggleArchive = async (noteId) => {
    try {
      await apiHelper.patch(`/notes/${noteId}/archive`);
      fetchNotes();
      setActiveMenu(null);
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    const ok = await confirm('Are you sure you want to delete this note?');
    if (!ok) return;

    try {
      await apiHelper.delete(`/notes/${noteId}`);
      fetchNotes();
      setActiveMenu(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Change note color
  const handleColorChange = async (noteId, color) => {
    try {
      await apiHelper.put(`/notes/${noteId}`, { color });
      fetchNotes();
      setShowColorPicker(null);
    } catch (error) {
      console.error('Error changing color:', error);
    }
  };

  // Open edit modal
  const openEditModal = (note) => {
    setEditingNote({ ...note });
    setShowEditModal(true);
    setActiveMenu(null);
  };

  // Save edited note
  const handleSaveEdit = async () => {
    if (!editingNote) return;

    let finalChecklist = [...(editingNote.checklist || [])];
    if (editingNote.type === 'checklist' && editChecklistItem.trim()) {
      finalChecklist.push({ text: editChecklistItem.trim(), completed: false });
    }

    try {
      await apiHelper.put(`/notes/${editingNote._id}`, {
        title: editingNote.title,
        content: editingNote.content,
        checklist: finalChecklist,
        type: editingNote.type,
        color: editingNote.color
      });
      fetchNotes();
      setShowEditModal(false);
      setEditingNote(null);
      setEditChecklistItem('');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  // Toggle checklist item in edit mode
  const toggleEditChecklistItem = (index) => {
    setEditingNote(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  // Add checklist item in edit mode
  const addEditChecklistItem = () => {
    if (editChecklistItem.trim()) {
      setEditingNote(prev => ({
        ...prev,
        checklist: [...(prev.checklist || []), { text: editChecklistItem.trim(), completed: false }]
      }));
      setEditChecklistItem('');
    }
  };

  // Remove checklist item in edit mode
  const removeEditChecklistItem = (index) => {
    setEditingNote(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  // Toggle checklist item completion (inline)
  const handleToggleChecklistItem = async (noteId, itemId, currentCompleted) => {
    try {
      await apiHelper.patch(`/notes/${noteId}/checklist/${itemId}`, {
        completed: !currentCompleted
      });
      fetchNotes();
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Render note card
  const renderNoteCard = (note) => {
    const completedCount = note.checklist?.filter(item => item.completed).length || 0;
    const totalCount = note.checklist?.length || 0;

    return (
      <div 
        key={note._id} 
        className={`note-card ${note.pinned ? 'note-card--pinned' : ''}`}
        style={{ backgroundColor: note.color }}
        onClick={() => openEditModal(note)}
      >
        {note.pinned && (
          <div className="note-card__pin-indicator">
            <FaThumbtack />
          </div>
        )}

        {note.title && (
          <h3 className="note-card__title">{note.title}</h3>
        )}

        {note.type === 'text' ? (
          <p className="note-card__content">{note.content}</p>
        ) : (
          <div className="note-card__checklist">
            {note.checklist?.slice(0, 5).map((item) => (
              <div 
                key={item._id} 
                className={`note-card__checklist-item ${item.completed ? 'note-card__checklist-item--completed' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleChecklistItem(note._id, item._id, item.completed);
                }}
              >
                <span className="note-card__checkbox">
                  {item.completed && <FaCheck />}
                </span>
                <span className="note-card__checklist-text">{item.text}</span>
              </div>
            ))}
            {totalCount > 5 && (
              <span className="note-card__more">+{totalCount - 5} more items</span>
            )}
            {totalCount > 0 && (
              <div className="note-card__progress">
                {completedCount}/{totalCount} completed
              </div>
            )}
          </div>
        )}

        <div className="note-card__footer">
          <span className="note-card__date">{formatDate(note.updatedAt)}</span>
          
          <div className="note-card__actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="note-card__action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(showColorPicker === note._id ? null : note._id);
                setActiveMenu(null);
              }}
              title="Change color"
            >
              <FaPalette />
            </button>
            
            <button 
              className="note-card__action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(note._id);
              }}
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              <FaThumbtack className={note.pinned ? 'pinned' : ''} />
            </button>
            
            <button 
              className="note-card__action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === note._id ? null : note._id);
                setShowColorPicker(null);
              }}
            >
              <FaEllipsisV />
            </button>

            {showColorPicker === note._id && (
              <div className="note-card__color-picker">
                {COLORS.map(color => (
                  <button
                    key={color.id}
                    className={`note-card__color-option ${note.color === color.id ? 'active' : ''}`}
                    style={{ backgroundColor: color.id }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(note._id, color.id);
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            )}

            {activeMenu === note._id && (
              <div className="note-card__menu">
                <button onClick={(e) => { e.stopPropagation(); openEditModal(note); }}>
                  <FaEdit /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleToggleArchive(note._id); }}>
                  {showArchived ? <FaUndo /> : <FaArchive />}
                  {showArchived ? 'Unarchive' : 'Archive'}
                </button>
                <button 
                  className="danger" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="notes-page">
      {/* Header */}
      <div className="notes-page__header">
        <div className="notes-page__header-left">
          <h1 className="notes-page__title">
            <FaStickyNote /> Notes
          </h1>
          <p className="notes-page__subtitle">
            Keep track of your ideas and tasks
          </p>
        </div>
        <div className="notes-page__header-right">
          <div className="notes-page__tabs">
            <button 
              className={`notes-page__tab ${!showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(false)}
            >
              <FaStickyNote /> Notes
            </button>
            <button 
              className={`notes-page__tab ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(true)}
            >
              <FaArchive /> Archived
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="notes-page__search">
        <FaSearch className="notes-page__search-icon" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="notes-page__search-input"
        />
        {searchTerm && (
          <button 
            className="notes-page__search-clear"
            onClick={() => setSearchTerm('')}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* New Note Input */}
      {!showArchived && (
        <div 
          className={`new-note ${showNewNote ? 'new-note--expanded' : ''}`}
          style={{ backgroundColor: newNote.color }}
        >
          {!showNewNote ? (
            <div 
              className="new-note__placeholder"
              onClick={() => setShowNewNote(true)}
            >
              <FaPlus /> Take a note...
            </div>
          ) : (
            <div className="new-note__form">
              <input
                type="text"
                placeholder="Title"
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                className="new-note__title-input"
                autoFocus
              />

              {/* Note Type Tabs */}
              <div className="new-note__type-tabs">
                <button 
                  className={`new-note__type-tab ${newNoteType === 'text' ? 'active' : ''}`}
                  onClick={() => setNewNoteType('text')}
                >
                  <FaStickyNote /> Text
                </button>
                <button 
                  className={`new-note__type-tab ${newNoteType === 'checklist' ? 'active' : ''}`}
                  onClick={() => setNewNoteType('checklist')}
                >
                  <FaListUl /> Checklist
                </button>
              </div>

              {newNoteType === 'text' ? (
                <textarea
                  placeholder="Take a note..."
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  className="new-note__content-input"
                  rows={3}
                />
              ) : (
                <div className="new-note__checklist">
                  {newNote.checklist.map((item, index) => (
                    <div key={index} className="new-note__checklist-item">
                      <span className="new-note__checkbox" />
                      <span className="new-note__checklist-text">{item.text}</span>
                      <button 
                        className="new-note__checklist-remove"
                        onClick={() => removeChecklistItem(index)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <div className="new-note__checklist-input">
                    <span className="new-note__checkbox" />
                    <input
                      type="text"
                      placeholder="Add item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                    />
                    <button 
                      className="new-note__checklist-add"
                      onClick={addChecklistItem}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              )}

              {/* Color Picker */}
              <div className="new-note__colors">
                {COLORS.map(color => (
                  <button
                    key={color.id}
                    className={`new-note__color-btn ${newNote.color === color.id ? 'active' : ''}`}
                    style={{ backgroundColor: color.id }}
                    onClick={() => setNewNote(prev => ({ ...prev, color: color.id }))}
                    title={color.name}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="new-note__actions">
                <button 
                  className="new-note__cancel"
                  onClick={resetNewNote}
                >
                  Cancel
                </button>
                <button 
                  className="new-note__save"
                  onClick={handleCreateNote}
                >
                  Save Note
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="notes-page__loading">
          <div className="notes-page__spinner" />
          <p>Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-page__empty">
          <div className="notes-page__empty-icon">
            {showArchived ? <FaArchive /> : <FaInbox />}
          </div>
          <h3>{showArchived ? 'No archived notes' : 'No notes yet'}</h3>
          <p>{showArchived ? 'Your archived notes will appear here' : 'Click "Take a note..." to create your first note'}</p>
        </div>
      ) : (
        <div className="notes-page__content">
          {pinnedNotes.length > 0 && !showArchived && (
            <div className="notes-section">
              <h2 className="notes-section__title">
                <FaThumbtack /> Pinned
              </h2>
              <div className="notes-grid">
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div className="notes-section">
              {pinnedNotes.length > 0 && !showArchived && (
                <h2 className="notes-section__title">Others</h2>
              )}
              <div className="notes-grid">
                {unpinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingNote && (
        <div className="note-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div 
            className="note-modal"
            style={{ backgroundColor: editingNote.color }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="note-modal__header">
              <input
                type="text"
                placeholder="Title"
                value={editingNote.title}
                onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                className="note-modal__title-input"
              />
              <button 
                className="note-modal__close"
                onClick={() => setShowEditModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="note-modal__body">
              {editingNote.type === 'text' ? (
                <textarea
                  placeholder="Note content..."
                  value={editingNote.content}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                  className="note-modal__content-input"
                  rows={8}
                />
              ) : (
                <div className="note-modal__checklist">
                  {editingNote.checklist?.map((item, index) => (
                    <div 
                      key={item._id || index} 
                      className={`note-modal__checklist-item ${item.completed ? 'completed' : ''}`}
                    >
                      <button 
                        className="note-modal__checkbox"
                        onClick={() => toggleEditChecklistItem(index)}
                      >
                        {item.completed && <FaCheck />}
                      </button>
                      <span className="note-modal__checklist-text">{item.text}</span>
                      <button 
                        className="note-modal__checklist-remove"
                        onClick={() => removeEditChecklistItem(index)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <div className="note-modal__checklist-input">
                    <span className="note-modal__checkbox-placeholder" />
                    <input
                      type="text"
                      placeholder="Add item..."
                      value={editChecklistItem}
                      onChange={(e) => setEditChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEditChecklistItem()}
                    />
                    <button 
                      className="note-modal__checklist-add"
                      onClick={addEditChecklistItem}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="note-modal__colors">
              {COLORS.map(color => (
                <button
                  key={color.id}
                  className={`note-modal__color-btn ${editingNote.color === color.id ? 'active' : ''}`}
                  style={{ backgroundColor: color.id }}
                  onClick={() => setEditingNote(prev => ({ ...prev, color: color.id }))}
                  title={color.name}
                />
              ))}
            </div>

            <div className="note-modal__footer">
              <span className="note-modal__date">
                Edited {formatDate(editingNote.updatedAt)}
              </span>
              <div className="note-modal__actions">
                <button 
                  className="note-modal__cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="note-modal__save"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(activeMenu || showColorPicker) && (
        <div 
          className="notes-page__overlay"
          onClick={() => { setActiveMenu(null); setShowColorPicker(null); }}
        />
      )}
    </div>
  );
};

export default Note;
