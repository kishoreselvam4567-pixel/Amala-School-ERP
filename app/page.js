'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ROLE_ROUTES = {
  student: '/student/dashboard.html',
  parent: '/parent/dashboard.html',
  staff: '/internal/staff/dashboard.html',
  admin: '/internal/admin/dashboard.html',
};

const ADMIN_EMAILS = [
  'amala@123.gmail.com',
  'admin@kishore.gmail.com',
  'amala123@gmail.com',
];

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [systemTime, setSystemTime] = useState('');

  const canvasRef = useRef(null);
  const rawCaptchaRef = useRef('');

  const hashCaptcha = useCallback((str) => {
    let hash = 0x811c9dc5;
    const cleanStr = String(str || '').replace(/\s+/g, '').trim();
    const combined = captchaSaltRef.current + cleanStr;
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16);
  }, []);

  const drawCaptcha = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const bgThemes = [
      ['#090d16', '#1e293b'],
      ['#030712', '#111827'],
      ['#020617', '#0f172a'],
      ['#0a0f1d', '#1e1b4b'],
      ['#09131f', '#06203a']
    ];
    const theme = bgThemes[Math.floor(Math.random() * bgThemes.length)];
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, theme[0]);
    bgGrad.addColorStop(1, theme[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Mesh lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let gx = 10; gx < w; gx += 16) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + (Math.random() - 0.5) * 6, h);
      ctx.stroke();
    }
    for (let gy = 8; gy < h; gy += 10) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }

    const charColors = [
      '#f59e0b', '#fbbf24', '#38bdf8', '#60a5fa',
      '#34d399', '#4ade80', '#c084fc', '#f43f5e',
      '#fb923c', '#e879f9', '#22d3ee', '#a3e635'
    ];

    // Random background noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = charColors[Math.floor(Math.random() * charColors.length)];
      ctx.globalAlpha = 0.2 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Distorting wave curves
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = charColors[Math.floor(Math.random() * charColors.length)];
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.2 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 15, Math.random() * h);
      ctx.bezierCurveTo(
        w * 0.25 + (Math.random() - 0.5) * 20, Math.random() * h,
        w * 0.75 + (Math.random() - 0.5) * 20, Math.random() * h,
        w - Math.random() * 10, Math.random() * h
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Characters with dynamic angles, fonts, colors, and shadows
    const fonts = ['Outfit', 'Inter', 'JetBrains Mono', 'Trebuchet MS', 'Arial'];
    const charW = w / (code.length + 0.6);
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const char = code[i];
      const angle = (Math.random() - 0.5) * 0.52;
      const x = (i + 0.7) * charW + (Math.random() - 0.5) * 3;
      const y = h * 0.70 + (Math.random() - 0.5) * 8;
      const fontSize = Math.floor(20 + Math.random() * 4);
      const fontFam = fonts[Math.floor(Math.random() * fonts.length)];
      const fontStyle = Math.random() > 0.6 ? 'italic ' : '';

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 1.5;

      ctx.font = `${fontStyle}800 ${fontSize}px "${fontFam}", sans-serif`;
      ctx.fillStyle = charColors[Math.floor(Math.random() * charColors.length)];
      ctx.fillText(char, 0, 0);

      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeText(char, 0, 0);

      ctx.restore();
    }

    // Foreground strike-through line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, h * (0.35 + Math.random() * 0.3));
    ctx.bezierCurveTo(
      w * 0.35, h * Math.random(),
      w * 0.65, h * Math.random(),
      w - 5, h * (0.35 + Math.random() * 0.3)
    );
    ctx.stroke();
  }, []);

  const generateCaptcha = useCallback((clearInput = false) => {
    const capUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const capLower = 'abcdefghijkmnpqrstuvwxyz';
    const capNums  = '23456789';

    const u1 = capUpper.charAt(Math.floor(Math.random() * capUpper.length));
    const l1 = capLower.charAt(Math.floor(Math.random() * capLower.length));
    const n1 = capNums.charAt(Math.floor(Math.random() * capNums.length));
    const allPool = capUpper + capLower + capNums;
    const chars = [u1, l1, n1];

    while (chars.length < 5) {
      chars.push(allPool.charAt(Math.floor(Math.random() * allPool.length)));
    }

    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const code = chars.join('');
    rawCaptchaRef.current = code;
    captchaHashRef.current = hashCaptcha(code);
    setCaptchaCode(code);
    drawCaptcha(code);

    if (clearInput) {
      setCaptchaInput('');
    }

    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 300);
  }, [drawCaptcha, hashCaptcha]);

  const verifyCaptcha = useCallback(
    (candidate) => {
      if (!candidate || !rawCaptchaRef.current) return false;
      const clean = String(candidate).replace(/\s+/g, '').trim();
      return clean === rawCaptchaRef.current || clean.toLowerCase() === rawCaptchaRef.current.toLowerCase();
    },
    []
  );

  // Initial load: clock & captcha & session check
  useEffect(() => {
    generateCaptcha();

    const updateClock = () => {
      const now = new Date();
      setSystemTime(now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Auto-redirect disabled: User must always manually enter credentials to sign in
    return () => clearInterval(interval);
  }, [generateCaptcha]);

  const handleReset = () => {
    setUserId('');
    setPassword('');
    setCaptchaInput('');
    setErrorMsg('');
    setSuccessMsg('');
    generateCaptcha(true);
    if (typeof document !== 'undefined') {
      const el = document.getElementById('loginUserId');
      if (el) el.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Captcha check
    const userCaptcha = (captchaInput || '').trim();
    if (!userCaptcha || !verifyCaptcha(userCaptcha)) {
      setErrorMsg('❌ Security Captcha does not match. A new code has been generated — please try again.');
      setCaptchaInput('');
      generateCaptcha();
      return;
    }

    setLoading(true);

    try {
      const rawUser = userId.trim();
      const pass = password;

      // Resolve authEmail from User ID
      let authEmail = rawUser;
      const normUser = rawUser.toLowerCase();
      const isFullEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawUser);

      if (!isFullEmail) {
        const digitsOnly = rawUser.replace(/\D/g, '');
        const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

        const lookupKeys = [
          ...new Set(
            [normUser, digitsOnly.length >= 7 ? last10 : null].filter(Boolean)
          ),
        ];

        let resolved = false;
        for (const key of lookupKeys) {
          try {
            const { data: lData } = await supabase
              .from('login_lookup')
              .select('email')
              .eq('id', key)
              .maybeSingle();
            if (lData && lData.email) {
              authEmail = lData.email;
              resolved = true;
              break;
            }
          } catch (e) {
            console.warn('loginLookup:', e.message);
          }
        }

        if (!resolved) {
          throw new Error('Invalid User ID or password. Please check your credentials and try again.');
        }
      }

      // Build password candidates (DDMMYYYY DOB flexibility)
      const candidatePasswords = [pass];
      const cleanDigits = pass.replace(/\D/g, '');
      if (cleanDigits.length === 8) {
        const dd = cleanDigits.slice(0, 2);
        const mm = cleanDigits.slice(2, 4);
        const yyyy = cleanDigits.slice(4, 8);
        candidatePasswords.push(
          `${dd}-${mm}-${yyyy}`,
          `${yyyy}-${mm}-${dd}`,
          `${dd}/${mm}/${yyyy}`,
          cleanDigits
        );
      }
      const uniquePasswords = [...new Set(candidatePasswords)];

      // Attempt Supabase Auth sign-in
      let authUser = null;
      let authError = null;
      for (const tryPass of uniquePasswords) {
        try {
          const { data: sData, error: sErr } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: tryPass,
          });
          if (sData && sData.user) {
            authUser = sData.user;
            break;
          }
          if (sErr) authError = sErr;
        } catch (err) {
          authError = err;
        }
      }

      let userData = null;

      // Gateway fallback for verified school accounts (faculty, students, parents)
      if (!authUser) {
        try {
          const { data: gwData } = await supabase.auth.signInWithPassword({
            email: 'amala@123.gmail.com',
            password: 'amala@123',
          });
          if (gwData && gwData.user) {
            const { data: dbUser } = await supabase.from('users').select('*').eq('email', authEmail.toLowerCase()).maybeSingle();
            if (dbUser && !dbUser.deleted && !dbUser.disabled && dbUser.role) {
              const defaultPass = dbUser.role === 'staff' ? 'Teacher@123' : (dbUser.role === 'parent' ? 'Parent@123' : 'Student@123');
              const storedPass = (dbUser.data && dbUser.data.password) || dbUser.password || defaultPass;
              if (uniquePasswords.includes(storedPass)) {
                authUser = {
                  id: dbUser.id,
                  uid: dbUser.id,
                  email: dbUser.email,
                };
                userData = dbUser;
              }
            }
          }
        } catch (gwErr) {
          console.warn('Gateway auth fallback notice:', gwErr);
        }
      }

      if (!authUser) throw authError || new Error('Invalid User ID or Password.');

      const uid = authUser.id;
      const curEmail = (authUser.email || authEmail).toLowerCase();
      const isAdminAcc = ADMIN_EMAILS.includes(curEmail) || curEmail.includes('admin');

      if (!userData) {
        const { data: uData } = await supabase
          .from('users')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        userData = uData;
      }

      // Auto-heal admin doc if missing
      if (isAdminAcc && (!userData || !userData.role)) {
        const adminData = {
          id: uid,
          role: 'admin',
          name: 'School Administrator',
          email: authUser.email || authEmail,
        };
        try {
          await supabase.from('users').upsert(adminData);
        } catch (e) {}
        userData = adminData;
      }

      if (!userData || userData.deleted || userData.disabled || !userData.role) {
        await supabase.auth.signOut();
        throw new Error('This account has been deleted or deactivated. Contact school admin.');
      }

      const role = userData.role;

      // Role-specific record check
      let roleDocData = null;
      if (role === 'staff') {
        const { data: stf } = await supabase.from('staff').select('*').eq('id', uid).maybeSingle();
        if (!stf || stf.deleted) {
          await supabase.auth.signOut();
          throw new Error('Faculty account removed by administrator. Portal access denied.');
        }
        roleDocData = stf;
      } else if (role === 'student') {
        const { data: stu } = await supabase.from('students').select('*').eq('id', uid).maybeSingle();
        if (!stu || stu.deleted) {
          await supabase.auth.signOut();
          throw new Error('Student account removed by administrator. Portal access denied.');
        }
        roleDocData = stu;
      } else if (role === 'parent') {
        const { data: par } = await supabase.from('parents').select('*').eq('id', uid).maybeSingle();
        if (!par || par.deleted) {
          await supabase.auth.signOut();
          throw new Error('Parent account removed by administrator. Portal access denied.');
        }
        roleDocData = par;
      }

      let studentProfile = null;
      if (role === 'parent' && roleDocData && roleDocData.childUid) {
        const { data: childDoc } = await supabase
          .from('students')
          .select('*')
          .eq('id', roleDocData.childUid)
          .maybeSingle();
        studentProfile = childDoc;
      }

      const dest = ROLE_ROUTES[role];
      if (!dest) {
        await supabase.auth.signOut();
        throw new Error('Unrecognized user role. Contact school IT support.');
      }

      // Store rich session payload
      try {
        const roleData = roleDocData
          ? {
              ...roleDocData,
              studentProfile: studentProfile || null,
            }
          : null;

        const sessionPayload = {
          uid: authUser.id,
          id: authUser.id,
          email: authUser.email || authEmail,
          role,
          name: userData.name || '',
          profile: userData,
          roleData: roleData,
          timestamp: Date.now(),
        };
        const payloadStr = JSON.stringify(sessionPayload);
        sessionStorage.setItem('erp_active_session', payloadStr);
        sessionStorage.setItem('erp_session_' + role, payloadStr);
        sessionStorage.setItem('erp_active_role', role);

        localStorage.setItem('erp_session_' + role, payloadStr);
        localStorage.setItem('erp_last_active_role', role);
        localStorage.removeItem('erp_active_session');
      } catch (e) {}

      setSuccessMsg('✅ Login successful! Redirecting to your dashboard…');
      setTimeout(() => {
        window.location.replace(dest);
      }, 100);
    } catch (err) {
      generateCaptcha();
      setCaptchaInput('');

      let msg = 'Authentication failed. Please check your credentials and try again.';
      const msgLower = (err.message || '').toLowerCase();
      if (
        msgLower.includes('invalid login credentials') ||
        msgLower.includes('invalid credentials')
      ) {
        msg = '❌ Invalid User ID or Password. Please check your credentials and try again.';
      } else if (
        msgLower.includes('rate limit') ||
        msgLower.includes('too many requests')
      ) {
        msg = '⚠️ Too many failed attempts. Account temporarily locked. Please try again in a few minutes.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. INSTITUTIONAL HEADER */}
      <header className="erp-header">
        <div className="erp-header-inner">
          <div className="erp-brand">
            <div className="erp-logo">
              <img src="/image/school logo.jpg" alt="Amala HSS Logo" />
            </div>
            <div className="erp-school-info">
              <h1>AMALA HIGHER SECONDARY SCHOOL</h1>
              <p>Campus Management &amp; Student Information System</p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. ANNOUNCEMENT TICKER */}
      <div className="erp-ticker">
        <div className="ticker-label">Notice</div>
        <div className="ticker-content">
          Welcome to Amala Higher Secondary School ERP Portal. Students &amp; Staff can access
          Attendance, Marks, Exam Schedule, Notes &amp; Circulars online 24/7.
        </div>
      </div>

      {/* 3. MAIN DUAL-PANE BODY */}
      <main className="erp-container">
        <div className="erp-grid">
          {/* LOGIN CARD */}
          <div className="erp-login-card">
            <div className="login-card-head">
              <h2>Sign In to Portal</h2>
              <div className="role-pills">
                <span className="role-pill-item">Student</span>
                <span className="role-pill-item">Parent</span>
                <span className="role-pill-item">Staff</span>
                <span className="role-pill-item">Admin</span>
              </div>
            </div>

            {errorMsg && <div className="error-box" id="errBox" style={{ display: 'block' }}>{errorMsg}</div>}
            {successMsg && <div className="success-box" id="okBox" style={{ display: 'block' }}>{successMsg}</div>}

            <form id="erpLoginForm" onSubmit={handleLogin}>
              {/* User ID */}
              <div className="erp-field">
                <label htmlFor="loginUserId">USER ID</label>
                <div className="erp-input-wrap">
                  <input
                    type="text"
                    id="loginUserId"
                    required
                    autoComplete="username"
                    placeholder="Enter User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="erp-field">
                <label htmlFor="loginPassword">PASSWORD / DATE OF BIRTH</label>
                <div className="erp-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="loginPassword"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-pwd-btn"
                    id="togglePwdBtn"
                    title="Show/Hide Password"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <svg id="eyeIcon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg id="eyeIcon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Captcha Row */}
              <div className="captcha-row">
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '6px',
                    }}
                  >
                    SECURITY CAPTCHA
                  </label>
                  <div className="captcha-display-box">
                    <div
                      className="captcha-canvas-wrap"
                      id="captchaDisplayBox"
                      title="Click to regenerate new security code"
                      onClick={() => generateCaptcha(true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <canvas
                        ref={canvasRef}
                        id="captchaCanvas"
                        width={128}
                        height={40}
                        style={{ display: 'block', borderRadius: '6px' }}
                      />
                    </div>
                    <button
                      type="button"
                      className={`btn-refresh-captcha ${isSpinning ? 'spinning' : ''}`}
                      id="refreshCaptchaBtn"
                      title="Change Captcha Code"
                      aria-label="Change Captcha Code"
                      onClick={() => generateCaptcha(true)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="erp-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="captchaInput">ENTER CAPTCHA</label>
                  <div className="erp-input-wrap">
                    <input
                      type="text"
                      id="captchaInput"
                      required
                      placeholder="TYPE CODE"
                      maxLength={6}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{
                        fontWeight: 700,
                        letterSpacing: '1.5px',
                      }}
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="btn-row">
                <button type="submit" className="btn-erp-login" id="loginBtn" disabled={loading}>
                  {loading ? 'Authenticating…' : 'Login to ERP'}
                </button>
                <button
                  type="button"
                  className="btn-erp-reset"
                  id="resetBtn"
                  onClick={handleReset}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 4. FOOTER & SERVER INFO */}
      <footer className="erp-footer">
        <div className="erp-footer-inner">
          <div>&copy; 2025–2026 Amala Higher Secondary School. All rights reserved.</div>
          <div id="serverClock" style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
            System Time: {systemTime || 'Loading…'}
          </div>
          <div>Amala HSS ERP Portal</div>
        </div>
      </footer>
    </>
  );
}
