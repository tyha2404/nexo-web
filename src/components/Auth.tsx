import { SlidingTabs } from './ui';
import React, { useState } from 'react';
import { authService } from '../services';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../commons/utils';
import { SPINNER_BUTTON } from './ui';

interface AuthProps {
  onSuccess?: () => void;
}

// `touch:` (see tailwind.css) is wider than `mobile:`: any coarse pointer up to 1024px.
const INPUT_GROUP = 'flex flex-col gap-2 text-left';
const INPUT_LABEL = 'pl-1 text-[0.85rem] font-medium text-muted';
const INPUT_FIELD =
  'box-border w-full rounded-md border border-line bg-input px-4 py-3 text-[0.95rem] text-main transition-all duration-200 ease-[ease] focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] focus:outline-none';
const TOGGLE_BTN =
  'flex-1 cursor-pointer rounded-sm border-none p-2.5 text-[0.95rem] font-semibold';
const TOGGLE_ACTIVE = 'bg-transparent text-white';
const TOGGLE_IDLE = 'bg-transparent text-muted';

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form states
  const [identifier, setIdentifier] = useState<string>('');
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
        // Handle Login (accepts Username or Email)
        const response = await authService.login(identifier, password);
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

        // Auto-login with the email: the account lives in Supabase Auth, which the
        // username-based Go login can't see until the sync trigger has run.
        const loginResponse = await authService.login(email, password);
        localStorage.setItem('token', loginResponse.token);

        toast.success('Tạo tài khoản và đăng nhập thành công!');
        window.dispatchEvent(new Event('auth-changed'));
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Đã xảy ra lỗi trong quá trình xác thực.'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (mode: boolean) => {
    setIsLogin(mode);
    setUsernameError('');
  };

  return (
    <div className="flex min-h-[480px] w-full items-center justify-center touch:min-h-0">
      <div className="auth-container animate-fade-in box-border w-full max-w-[440px] rounded-xl border border-line bg-card p-10 text-main shadow-app-lg backdrop-blur-[16px] touch:p-5">
        <div className="mb-8 flex flex-col items-center text-center touch:mb-5">
          <img
            src="/logo-transparent.svg"
            alt="Nexo logo"
            className="mb-[0.85rem] size-16 drop-shadow-[0_4px_12px_var(--primary-glow)] transition-transform duration-300 ease-[ease] hover:[transform:scale(1.05)_rotate(2deg)] touch:size-12"
          />
          <h2 className="mb-2 text-[2rem] font-bold text-main touch:text-[1.5rem]">Nexo Portal</h2>
          <p className="text-[0.95rem] text-muted">
            {isLogin
              ? 'Truy cập bảng điều khiển tài chính của bạn'
              : 'Tạo tài khoản bảo mật của bạn'}
          </p>
        </div>

        <SlidingTabs className="mb-8 flex rounded-md border border-line bg-input p-1">
          <button
            type="button"
            aria-pressed={isLogin}
            className={`${TOGGLE_BTN} ${isLogin ? TOGGLE_ACTIVE : TOGGLE_IDLE}`}
            onClick={() => toggleMode(true)}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            aria-pressed={!isLogin}
            className={`${TOGGLE_BTN} ${!isLogin ? TOGGLE_ACTIVE : TOGGLE_IDLE}`}
            onClick={() => toggleMode(false)}
          >
            Đăng ký
          </button>
        </SlidingTabs>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {isLogin ? (
            <div className={INPUT_GROUP}>
              <label className={INPUT_LABEL} htmlFor="identifier">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  className={INPUT_FIELD}
                  placeholder="Nhập tên đăng nhập hoặc email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>
          ) : (
            <>
              <div className={INPUT_GROUP}>
                <label className={INPUT_LABEL} htmlFor="username">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    className={`${INPUT_FIELD} ${usernameError ? 'input-invalid' : ''}`}
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (e.target.value) validateUsername(e.target.value);
                      else setUsernameError('');
                    }}
                    autoCapitalize="none"
                    required
                  />
                </div>
                {usernameError && (
                  <span className="mt-1 block text-[0.78rem] text-[#ef4444]">{usernameError}</span>
                )}
              </div>

              <div className={INPUT_GROUP}>
                <label className={INPUT_LABEL} htmlFor="email">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    className={INPUT_FIELD}
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoCapitalize="none"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className={INPUT_GROUP}>
            <label className={INPUT_LABEL} htmlFor="password">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${INPUT_FIELD} pr-[45px]`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-muted transition-all duration-200 ease-[ease]"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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

          <button
            type="submit"
            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-(color:--primary-gradient) align-middle leading-[1.2] p-3.5 text-[1rem] font-semibold text-white shadow-[0_4px_12px_var(--primary-glow)] transition-all duration-300 ease-[ease] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_var(--primary-glow)] active:translate-y-0 disabled:translate-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            disabled={isLoading}
          >
            {isLoading && <span className={SPINNER_BUTTON}></span>}
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Auth;
