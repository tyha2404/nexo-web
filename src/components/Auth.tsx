import React, { useState } from 'react';
import { authService } from '../services/api';
import './Auth.css';

interface AuthProps {
  onSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [name, setName] = useState<string>(''); // Handled local state as requested

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // Handle Login
        const response = await authService.login(email, password);
        localStorage.setItem('token', response.token);
        
        setSuccess('Đăng nhập thành công!');
        window.dispatchEvent(new Event('auth-changed'));
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle Registration
        // Go backend requires username, email, password.
        // If the user filled 'name', we can use it or log it, but the backend accepts username/email/password.
        await authService.register(username, email, password);
        
        // Auto-login the user after registration to get the token
        const loginResponse = await authService.login(email, password);
        localStorage.setItem('token', loginResponse.token);
        
        setSuccess('Tạo tài khoản và đăng nhập thành công!');
        window.dispatchEvent(new Event('auth-changed'));
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (mode: boolean) => {
    setIsLogin(mode);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <h2 className="auth-title">Nexo Portal</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Truy cập bảng điều khiển tài chính của bạn' : 'Tạo tài khoản bảo mật của bạn'}
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

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="input-group">
                <label className="input-label" htmlFor="name">
                  Họ và tên
                </label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    className="input-field"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="username">
                  Tên đăng nhập
                </label>
                <div className="input-wrapper">
                  <input
                    id="username"
                    type="text"
                    className="input-field"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            </>
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
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
