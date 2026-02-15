import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import './PayPolicy.scss';

const PayPolicy = ({ open, onClose, triggerText = 'View Terms and Conditions' }) => {
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = typeof open !== 'undefined';
  const isOpen = isControlled ? open : localOpen;

  const handleOpen = () => {
    if (!isControlled) setLocalOpen(true);
    else if (typeof onClose === 'function') onClose(false); // for controlled components, parent should handle
  };

  const handleClose = () => {
    if (isControlled) {
      if (typeof onClose === 'function') onClose();
    } else setLocalOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Payment Terms and Conditions"
      size="medium"
      
    >
      <div className="pay-policy" role="document" aria-label="Payment Terms and Conditions">
        <section className="pay-policy__section">
          <h3>Payment Terms and Conditions (Razorpay Integrated Payments)</h3>
          <p>These Payment Terms govern all payments made on the Platform.</p>
        </section>

        <section className="pay-policy__section">
          <h3>1. Payment Gateway</h3>
          <p>All payments are processed through Razorpay, a third-party payment gateway. The Platform does not store your card, UPI, or bank details.</p>
        </section>

        <section className="pay-policy__section">
          <h3>2. Subscription & Access</h3>
          <p>Payments are required to access paid plans or services on the Platform. Subscriptions are typically valid for one full year unless otherwise stated. Access to services is granted only after successful payment confirmation.</p>
        </section>

        <section className="pay-policy__section">
          <h3>3. No Refund Policy</h3>
          <p>All payments made on the Platform are <strong>NON-REFUNDABLE</strong>. There is no refund, cancellation, or chargeback facility, under any circumstances. This includes: partial usage, non-usage, accidental payments, account suspension or termination.</p>
        </section>

        <section className="pay-policy__section">
          <h3>4. Payment Failures</h3>
          <p>In case of payment failure, access will not be granted. The Platform is not responsible for bank issues, Razorpay downtime, network failures, or delayed confirmations.</p>
        </section>

        <section className="pay-policy__section">
          <h3>5. Taxes & Charges</h3>
          <p>Any applicable taxes, gateway fees, or charges are borne by the user. Pricing displayed may change without prior notice.</p>
        </section>

        <section className="pay-policy__section">
          <h3>6. Fraud & Misuse</h3>
          <p>Any attempt at fraudulent payment activity will result in immediate account suspension. The Platform reserves the right to report fraudulent activity to relevant authorities.</p>
        </section>

        <section className="pay-policy__section">
          <h3>7. Disputes</h3>
          <p>Payment disputes must be raised directly with Razorpay or the respective bank. The Platform owner is not liable for third-party gateway disputes.</p>
        </section>

        <section className="pay-policy__section">
          <h3>8. Modification of Payment Terms</h3>
          <p>Payment terms may be updated at any time. Continued use of paid services implies acceptance of revised terms.</p>
        </section>

        <section className="pay-policy__section">
          <h3>9. Governing Law</h3>
          <p>These Payment Terms shall be governed by the laws of India.</p>
        </section>

        <section className="pay-policy__section">
          <h3>10. Contact Information</h3>
          <p>
            For payment-related queries, please contact our support team at
            <button
              type="button"
              className="pay-policy__contact"
              aria-label="Contact support"
              onClick={() => {
                // Close this modal first then open the Help/Support modal
                handleClose();
                try {
                  window.dispatchEvent(new CustomEvent('openHelp'));
                } catch (e) {
                  console.error('Failed to dispatch openHelp event', e);
                }
              }}
            >
              miventsite@gmail.com
            </button>
          </p>
        </section>

        <footer className="pay-policy__footer">
          <button
            type="button"
            className="btn-primary"
            onClick={handleClose}
          >
            I Agree
          </button>
        </footer>
      </div>
    </Modal>
  );
};

export default PayPolicy;
