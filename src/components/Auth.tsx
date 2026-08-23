import React, { useState } from 'react';
import { authService } from '../services/api';
import { toast } from 'react-toastify';
import './Auth.css';

interface AuthProps {
  onSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string>('');

  const validateUsername = (val: string) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!val) {
      setUsernameError('Tên đăng nhập không được để trống.');
      return false;
    }
    if (!usernameRegex.test(val)) {
      setUsernameError('Tên đăng nhập từ 3-50 ký tự, chỉ gồm chữ cái, số, (_) hoặc (-).');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !validateUsername(username)) {
      toast.error('Tên đăng nhập không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    setIsLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        const response = await authService.login(email, password);
        localStorage.setItem('token', response.token);

        toast.success('Đăng nhập thành công!');
        window.dispatchEvent(new Event('auth-changed'));
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle Registration
        // Go backend requires username, email, password.
        await authService.register(username, email, password);

        // Auto-login the user after registration to get the token
        const loginResponse = await authService.login(email, password);
        localStorage.setItem('token', loginResponse.token);

        toast.success('Tạo tài khoản và đăng nhập thành công!');
        window.dispatchEvent(new Event('auth-changed'));
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (mode: boolean) => {
    setIsLogin(mode);
    setUsernameError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <img src="/favicon.svg" alt="Nexo logo" className="auth-logo" />
          <h2 className="auth-title">Nexo Portal</h2>
          <p className="auth-subtitle">
            {isLogin
              ? 'Truy cập bảng điều khiển tài chính của bạn'
              : 'Tạo tài khoản bảo mật của bạn'}
          </p>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => toggleMode(true)}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => toggleMode(false)}
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label" htmlFor="username">
                Tên đăng nhập
              </label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  className={`input-field ${usernameError ? 'input-invalid' : ''}`}
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (e.target.value) validateUsername(e.target.value);
                    else setUsernameError('');
                  }}
                  required={!isLogin}
                />
              </div>
              {usernameError && (
                <span
                  style={{
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    marginTop: '0.25rem',
                    display: 'block',
                  }}
                >
                  {usernameError}
                </span>
              )}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Địa chỉ Email
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Mật khẩu
            </label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '45px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading && <span className="spinner"></span>}
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Auth;
