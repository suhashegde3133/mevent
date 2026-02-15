import React from 'react';
import './TermsModal.scss';

const TermsModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="terms-modal" role="dialog" aria-modal="true" aria-label="Terms and Conditions">
      <div className="terms-modal__backdrop" onClick={onClose} />
      <div className="terms-modal__panel">
        <header className="terms-modal__header">
          <h2>MIVENT Terms and Conditions</h2>
          <button className="terms-modal__close" onClick={onClose} aria-label="Close terms window">✕</button>
        </header>

        <div className="terms-modal__content">
          <p>
            By accessing or using this Event Management System Platform (MIVENT), you
            agree to be bound by these Terms and Conditions. If you do not agree, please
            do not use the Platform.
          </p>

          <h3>1. Platform Overview</h3>
          <p>
            This Platform is a web-based event management system designed to help users
            manage events, services, team members, quotations, billing, and related
            activities. The Platform is accessible only through an internet connection and
            does not function as a standalone mobile or desktop application.
          </p>

          <h3>2. User Eligibility</h3>
          <p>
            Users must provide accurate and complete information during registration. You
            are responsible for maintaining the confidentiality of your login credentials.
            Any activity performed using your account is your responsibility.
          </p>

          <h3>3. Account &amp; Data Responsibility</h3>
          <p>
            Each registered user has access only to their own data. The Platform does not
            provide any backup, undo, restore, or recovery facility. Once data is deleted
            (events, services, chats, bills, policies, or any content), it is permanently
            removed and cannot be recovered under any circumstances. Users are solely
            responsible for managing and maintaining their data.
          </p>

          <h3>4. Chat &amp; Communication Policy</h3>
          <p>
            The in-app chat feature is provided only for communication between added or
            invited team members. The chat system is not end-to-end encrypted and should
            not be considered fully secure or private. Chat data is automatically reset
            or deleted after 30 days or based on system configuration. Once chat data is
            deleted, it cannot be restored. Users must not share sensitive, financial,
            or confidential personal information via chat.
          </p>

          <h3>5. Data Storage &amp; Privacy</h3>
          <p>
            The Platform stores only the data required for functionality. Deleted data is
            permanently erased from the system. The Platform does not guarantee protection
            against unauthorized access, data loss, or system failures. Users acknowledge
            and accept these limitations.
          </p>

          <h3>6. Platform Availability</h3>
          <p>
            The Platform may experience downtime due to maintenance, updates, or technical
            issues. Continuous availability is not guaranteed. The Platform owner is not
            liable for any losses caused due to downtime or service interruption.
          </p>

          <h3>7. Acceptable Use</h3>
          <p>Users must not:</p>
          <ul>
            <li>Misuse the Platform</li>
            <li>Upload illegal, harmful, or abusive content</li>
            <li>Attempt to hack, exploit, or reverse-engineer the system</li>
            <li>Use the Platform for unlawful activities</li>
          </ul>
          <p>Violation may result in suspension or permanent termination of access.</p>

          <h3>8. Limitation of Liability</h3>
          <p>
            The Platform is provided on an “as-is” and “as-available” basis. The Platform
            owner shall not be liable for:
          </p>
          <ul>
            <li>Data loss</li>
            <li>Business loss</li>
            <li>Revenue loss</li>
            <li>System errors</li>
            <li>User misuse</li>
          </ul>

          <h3>9. Modifications to Terms</h3>
          <p>
            The Platform owner reserves the right to update or modify these Terms at any
            time. Continued use of the Platform indicates acceptance of the updated terms.
          </p>

          <h3>10. Governing Law</h3>
          <p>These Terms shall be governed by and interpreted in accordance with the laws of India.</p>
        </div>

        <div className="terms-modal__contact" aria-label="Contact information">
          <h3>Contact</h3>
          <p>If you have questions about these Terms, contact our support team:</p>
          <ul>
            <li>Email: <a href="mailto:miventsite@gmail.com">miventsite@gmail.com</a></li>
          </ul>
        </div>
        <footer className="terms-modal__footer">
          <button className="terms-modal__accept" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
};

export default TermsModal;
