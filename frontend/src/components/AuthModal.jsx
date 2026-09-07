import React, { useState } from 'react';
import { X, UserCheck, Stethoscope, Lock, Mail, ShieldAlert, Award, Building, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentDoctor }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('dr_chen');
  const [loginPassword, setLoginPassword] = useState('doctor123');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('Neuro-Radiology & Oncology');
  const [regLicense, setRegLicense] = useState('');
  const [regHospital, setRegHospital] = useState('St. Jude Neuro-Diagnostics Center');
  const [regRole, setRegRole] = useState('lead_physician');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:511/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      setSuccessMsg(`Welcome back, ${data.user.full_name}!`);
      localStorage.setItem('neurolab_token', data.access_token);
      localStorage.setItem('neurolab_doctor', JSON.stringify(data.user));

      setTimeout(() => {
        onLoginSuccess(data.user, data.access_token);
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regFullName) {
      setErrorMsg('Please fill out all required clinical profile fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:511/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          full_name: regFullName.trim(),
          specialty: regSpecialty,
          license_number: regLicense.trim() || `MD-${Math.floor(10000 + Math.random() * 90000)}`,
          hospital_affiliation: regHospital,
          role: regRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccessMsg(`Doctor account registered for ${data.user.full_name}! Authenticating...`);
      localStorage.setItem('neurolab_token', data.access_token);
      localStorage.setItem('neurolab_doctor', JSON.stringify(data.user));

      setTimeout(() => {
        onLoginSuccess(data.user, data.access_token);
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const selectDoctorPreset = (username, pass) => {
    setLoginUsername(username);
    setLoginPassword(pass);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container auth-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Stethoscope className="modal-icon text-cyan" size={22} />
            <div>
              <h2 className="modal-title">Clinical Physician Authentication</h2>
              <p className="modal-subtitle">Secure access to patient health records, diagnostic imaging & AI insights</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Current Doctor Badge if logged in */}
        {currentDoctor && (
          <div className="auth-current-badge">
            <UserCheck size={16} color="var(--cyan-neon)" />
            <span>Currently logged in: <strong>{currentDoctor.full_name}</strong> ({currentDoctor.specialty})</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="auth-tab-bar">
          <button 
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            Physician Login
          </button>
          <button 
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            Register New Doctor
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="auth-alert error">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <Sparkles size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form-content">
            <div className="form-group">
              <label>Doctor Username or Medical Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input 
                  type="text" 
                  value={loginUsername} 
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. dr_chen or chen@neurolab.ai"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Physician Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Quick Doctor Preset Buttons */}
            <div className="doctor-presets-section">
              <span className="preset-label">Quick Sign-In (Hospital Staff):</span>
              <div className="preset-chips">
                <button type="button" className="preset-chip" onClick={() => selectDoctorPreset('dr_chen', 'doctor123')}>
                  Dr. A. Chen (Neuro-Rad)
                </button>
                <button type="button" className="preset-chip" onClick={() => selectDoctorPreset('dr_patel', 'doctor123')}>
                  Dr. S. Patel (Pulmonology)
                </button>
                <button type="button" className="preset-chip" onClick={() => selectDoctorPreset('dr_vance', 'doctor123')}>
                  Dr. M. Vance (Pathology)
                </button>
                <button type="button" className="preset-chip" onClick={() => selectDoctorPreset('dr_lin', 'doctor123')}>
                  Dr. J. Lin (Pediatrics)
                </button>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary-cyan" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In as Physician'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form-content">
            <div className="form-row-2col">
              <div className="form-group">
                <label>Doctor Full Name *</label>
                <div className="input-with-icon">
                  <UserCheck size={16} className="input-icon" />
                  <input 
                    type="text" 
                    value={regFullName} 
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Dr. Rachel Green, MD"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input 
                  type="text" 
                  value={regUsername} 
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. dr_green"
                  required
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Medical Specialty *</label>
                <select value={regSpecialty} onChange={(e) => setRegSpecialty(e.target.value)}>
                  <option value="Neuro-Radiology & Oncology">Neuro-Radiology & Oncology</option>
                  <option value="Thoracic Oncology & Pulmonology">Thoracic Oncology & Pulmonology</option>
                  <option value="Molecular Pathology & Hematology">Molecular Pathology & Hematology</option>
                  <option value="Pediatric Neurology & Genetics">Pediatric Neurology & Genetics</option>
                  <option value="Cardiology & Vascular Medicine">Cardiology & Vascular Medicine</option>
                  <option value="Internal Medicine & Diagnostics">Internal Medicine & Diagnostics</option>
                  <option value="General Surgery">General Surgery</option>
                </select>
              </div>

              <div className="form-group">
                <label>Medical License #</label>
                <div className="input-with-icon">
                  <Award size={16} className="input-icon" />
                  <input 
                    type="text" 
                    value={regLicense} 
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="e.g. MD-94182"
                  />
                </div>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Hospital Affiliation</label>
                <div className="input-with-icon">
                  <Building size={16} className="input-icon" />
                  <input 
                    type="text" 
                    value={regHospital} 
                    onChange={(e) => setRegHospital(e.target.value)}
                    placeholder="e.g. Metro University Hospital"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Physician Role</label>
                <select value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                  <option value="lead_physician">Attending / Lead Physician</option>
                  <option value="consultant">Consulting Specialist</option>
                  <option value="radiologist">Diagnostic Radiologist</option>
                  <option value="pathologist">Clinical Pathologist</option>
                </select>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Clinical Email *</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input 
                    type="email" 
                    value={regEmail} 
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Account Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input 
                    type="password" 
                    value={regPassword} 
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary-cyan" disabled={loading}>
                {loading ? 'Creating Doctor Profile...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
