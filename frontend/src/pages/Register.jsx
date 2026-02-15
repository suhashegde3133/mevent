import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { apiHelper } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import './Register.scss';
import { showToast } from '../utils/toast';
import { handleGoogleAuth } from '../utils/googleAuth';
import TermsModal from '../components/TandC/TermsModal';

const Register = () => {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');
  const termsAccepted = watch('terms', false);
  const dispatch = useDispatch();

  const togglePassword = () => setShowPassword(s => !s);
  const toggleConfirmPassword = () => setShowConfirmPassword(s => !s);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await apiHelper.post(API_ENDPOINTS.REGISTER, {
        email: data.email,
        password: data.password,
        name: data.name,
      });

      const { token, user } = result;
      const appUser = {
        id: user._id,
        fullName: user.name || data.name || '',
        email: user.email || '',
        avatar: user.photoURL || null,
        plan: user.plan || 'free',
        createdAt: user.createdAt,
      };

      dispatch(loginStart());
      dispatch(loginSuccess({ user: appUser, token }));
      showToast('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration failed', err);
      const message = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      dispatch(loginFailure(message));
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const [deactivatedError, setDeactivatedError] = useState(null);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setDeactivatedError(null);
    try {
      const result = await handleGoogleAuth();
      const { token, user } = result;
      const appUser = {
        id: user._id,
        fullName: user.name || '',
        email: user.email || '',
        avatar: user.photoURL || null,
        plan: user.plan || 'free',
        createdAt: user.createdAt,
      };

      dispatch(loginStart());
      dispatch(loginSuccess({ user: appUser, token }));
      showToast('Account created with Google successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Google sign up failed', err);
      const errorCode = err.response?.data?.code;
      const message = err.response?.data?.message || err.message || 'Google sign up failed. Please try again.';
      
      // Check if account is deactivated
      if (errorCode === 'ACCOUNT_DEACTIVATED') {
        setDeactivatedError(message);
        dispatch(loginFailure(message));
      } else {
        dispatch(loginFailure(message));
        showToast(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register">
      <div className="register__container">
        <div className="register__header">
          <h1 className="register__logo">MIVENT</h1>
          <p className="register__subtitle">Create your account to get started</p>
        </div>

        {/* Deactivated Account Warning */}
        {deactivatedError && (
          <div className="register__deactivated-warning">
            <div className="register__deactivated-icon">⚠️</div>
            <div className="register__deactivated-content">
              <h3>Account Terminated</h3>
              <p>{deactivatedError}</p>
            </div>
          </div>
        )}

        <form className="register__form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={togglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.9 12.05C4.9 7.5 8.82 5 12 5c1.4 0 2.73.38 3.88 1.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.12 15.88C12.98 16.5 11.52 16.5 10.38 15.88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="error">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={toggleConfirmPassword}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.9 12.05C4.9 7.5 8.82 5 12 5c1.4 0 2.73.38 3.88 1.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.12 15.88C12.98 16.5 11.52 16.5 10.38 15.88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
          </div>

          <div className="register__terms-checkbox">
            <label className="checkbox">
              <input 
                type="checkbox" 
                {...register('terms', { 
                  required: 'You must accept the terms and conditions' 
                })}
              />
              <span>
                I agree to the <button type="button" className="register__link" onClick={() => setShowTerms(true)}>Terms &amp; Conditions</button>
              </span>
            </label>
            {errors.terms && <span className="error">{errors.terms.message}</span>}
          </div>

          <button 
            type="submit" 
            className="register__submit"
            disabled={isLoading || !termsAccepted}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="register__divider">
            <span>or</span>
          </div>

          <button 
            type="button" 
            className="register__google-btn"
            onClick={handleGoogleSignUp}
            disabled={isLoading || !termsAccepted}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? 'Creating Account...' : 'Sign up with Google'}
          </button>
        </form>

        <div className="register__footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="register__link">Sign In</Link>
          </p>
        </div>
        <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    </div>
  );
};

export default Register;
