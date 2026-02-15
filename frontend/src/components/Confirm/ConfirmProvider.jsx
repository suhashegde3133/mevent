import React, { createContext, useCallback, useContext, useState } from 'react';
import Modal from '../Modal/Modal';
import './Confirm.scss';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    resolve: null, 
    reject: null, 
    confirmText: 'Yes', 
    cancelText: 'Cancel',
    showWarning: true 
  });

  const confirm = useCallback((message, options = {}) => {
    const { 
      title = 'Confirm', 
      confirmText = 'Yes', 
      cancelText = 'Cancel',
      showWarning = false 
    } = options;
    return new Promise((resolve, reject) => {
      setDialog({ 
        isOpen: true, 
        message, 
        title, 
        resolve, 
        reject, 
        confirmText, 
        cancelText,
        showWarning 
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (dialog.resolve) dialog.resolve(false);
    setDialog(d => ({ ...d, isOpen: false, resolve: null, reject: null }));
  }, [dialog]);

  const handleConfirm = useCallback(() => {
    if (dialog.resolve) dialog.resolve(true);
    setDialog(d => ({ ...d, isOpen: false, resolve: null, reject: null }));
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Modal
        isOpen={dialog.isOpen}
        onClose={handleClose}
        title={dialog.title}
        size="small"
      >
        <div className="confirm__message">
          {dialog.message}
          {dialog.showWarning && (
            <>
              <br />
              <span className="confirm__warning">⚠️ This action cannot be undone.</span>
            </>
          )}
        </div>
        <div className="confirm__actions">
          {dialog.cancelText && (
            <button className="btn" onClick={handleClose}>
              {dialog.cancelText}
            </button>
          )}
          <button className="btn" onClick={handleConfirm}>
            {dialog.confirmText}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirmContext = () => useContext(ConfirmContext);
