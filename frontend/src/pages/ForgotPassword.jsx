import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { showToast } from '../utils/toast';
import { apiHelper } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import './ForgotPassword.scss';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // Step 2: Entering code/password
  const [emailSent, setEmailSent] = useState(false); // Success state
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const emailValue = watch('email');
  const password = watch('password');

  const onSendCode = async (data) => {
    setIsLoading(true);
    try {
      await apiHelper.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email: data.email,
      });

      setIsResetting(true);
      showToast('A 6-digit reset code has been sent to your email');
    } catch (error) {
      console.error('ForgotPassword error', error);
      const message = error.response?.data?.message || error.message || 'Failed to send reset code. Please try again.';
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (data) => {
    setIsLoading(true);
    try {
      await apiHelper.post(API_ENDPOINTS.RESET_PASSWORD, {
        email: data.email,
        code: data.code,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      setEmailSent(true);
      showToast('Password reset successfully!');
    } catch (error) {
      console.error('ResetPassword error', error);
      const message = error.response?.data?.message || error.message || 'Failed to reset password. Please check your code.';
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="forgot-password">
        <div className="forgot-password__container">
          <div className="forgot-password__header">
            <h1 className="forgot-password__logo">MIVENT</h1>
            <p className="forgot-password__success-title">Success!</p>
          </div>

          <div className="forgot-password__success">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Password Changed!</h2>
            <p>Your password has been successfully reset. You can now login with your new password.</p>
            <Link to="/login" className="forgot-password__submit" style={{display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '20px'}}>
              Login Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password">
      <div className="forgot-password__container">
        <div className="forgot-password__header">
          <h1 className="forgot-password__logo">MIVENT</h1>
          <p className="forgot-password__subtitle">
            {isResetting ? 'Enter the code sent to your email' : 'Forgot your password ?'}
          </p>
        </div>

        {!isResetting ? (
          <form className="forgot-password__form" onSubmit={handleSubmit(onSendCode)}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your registered email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && <span className="error">{errors.email.message}</span>}
            </div>

            <p className="forgot-password__info">
              We'll send you a 6-digit code to reset your password.
            </p>

            <button 
              type="submit" 
              className="forgot-password__submit"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form className="forgot-password__form" onSubmit={handleSubmit(onResetPassword)}>
            <div className="form-group" style={{marginBottom: '10px'}}>
              <label>Email</label>
              <input type="text" value={emailValue || ''} disabled style={{background: '#f9f9f9', color: '#666'}} />
            </div>

            <div className="form-group">
              <label htmlFor="code">6-Digit Code</label>
              <input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                maxLength="6"
                {...register('code', { 
                  required: 'Reset code is required',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Code must be 6 digits'
                  }
                })}
              />
              {errors.code && <span className="error">{errors.code.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                {...register('password', { 
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
              />
              {errors.password && <span className="error">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
            </div>

            <button 
              type="submit" 
              className="forgot-password__submit"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Update Password'}
            </button>
            
            <button 
              type="button" 
              className="forgot-password__link" 
              style={{width: '100%', background: 'none', border: 'none', marginTop: '10px', cursor: 'pointer', textAlign: 'center'}}
              onClick={() => setIsResetting(false)}
            >
              Didn't get code? Try again
            </button>
          </form>
        )}

        <div className="forgot-password__footer">
          <div className="forgot-password__footer-links" role="navigation" aria-label="Auth links">
            <Link to="/login" className="forgot-password__link">Sign in</Link>
            <Link to="/register" className="forgot-password__link">Sign up</Link>
          </div>
        </div> 
      </div>
    </div>
  );
};

export default ForgotPassword;
