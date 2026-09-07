import React, { useState } from 'react';
import { 
  Activity, 
  FolderOpen, 
  Settings, 
  Search, 
  ChevronDown, 
  Bot, 
  UserCheck, 
  UserPlus, 
  Users, 
  HeartHandshake, 
  Zap, 
  FlaskConical, 
  UploadCloud, 
  LogOut, 
  Stethoscope,
  Menu,
  X 
} from 'lucide-react';

export default function Header({ 
  currentCase, 
  currentDoctor,
  onOpenCases, 
  onOpenSettings, 
  onToggleCopilot,
  onOpenAuth,
  onOpenNewPatient,
  onOpenConsultants,
  onOpenFamily,
  onOpenEarlyDetection,
  onOpenLabs,
  onOpenScanUploader,
  onLogout,
  searchTerm,
  setSearchTerm
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const docInitials = currentDoctor?.full_name
    ? currentDoctor.full_name.split(' ').map(n => n[0]).filter(Boolean).slice(-2).join('')
    : 'AC';

  const familyCount = currentCase?.family_members?.length || 0;
  const consultantCount = currentCase?.consulting_doctors?.length || 0;

  return (
    <header className="header-bar">
      {/* Brand & Logo + Workflow Banner */}
      <div className="brand-section">
        <a href="#home" className="brand-logo" title="NeuroLab AI Diagnostic Suite">
          <Activity className="brand-icon" size={22} />
          <h1 className="brand-title">
            NEUROLAB <span>AI</span>
          </h1>
        </a>

        {/* Workflow Breadcrumb Banner (Adapts/collapses with screen size) */}
        <div className="workflow-banner">
          <span className="workflow-label">Workflow:</span>
          <span className="workflow-patient">{currentCase?.name || 'Sarah Johnson'}</span>
          <span className="workflow-separator">|</span>
          <span className="workflow-id">{currentCase?.id || 'NL0194'}</span>
          <span className="workflow-separator">|</span>
          <span className="status-badge-reviewing">
            {currentCase?.status || currentCase?.case_status || 'REVIEWING'}
          </span>
        </div>
      </div>

      {/* Clinical Feature Toolbar (Fluid and responsive) */}
      <nav className="header-clinical-toolbar">
        {/* Admit Patient */}
        <button 
          className="header-action-btn pulse-glow-btn"
          onClick={onOpenNewPatient}
          title="Admit New Patient into Database"
        >
          <UserPlus size={14} color="var(--cyan-neon)" />
          <span className="btn-text-full">+ Admit Patient</span>
          <span className="btn-text-short">+ Admit</span>
        </button>

        {/* Family Tree Hierarchy */}
        <button 
          className="header-action-btn"
          onClick={onOpenFamily}
          title="Patient Family & Lineage Hierarchy"
        >
          <HeartHandshake size={14} color="var(--cyan-neon)" />
          <span className="btn-text-full">Family Tree</span>
          <span className="btn-text-short">Family</span>
          {familyCount > 0 && <span className="action-counter-badge">{familyCount}</span>}
        </button>

        {/* Multi-Doctor Care Team */}
        <button 
          className="header-action-btn"
          onClick={onOpenConsultants}
          title="Multi-Doctor Care Team Collaboration"
        >
          <Users size={14} color="var(--teal-accent)" />
          <span className="btn-text-full">Care Team</span>
          <span className="btn-text-short">Team</span>
          {consultantCount > 0 && <span className="action-counter-badge teal">{consultantCount}</span>}
        </button>

        {/* Early Disease Detection */}
        <button 
          className="header-action-btn early-detect-btn"
          onClick={onOpenEarlyDetection}
          title="Subclinical Early Disease Detection AI"
        >
          <Zap size={14} color="#fbbf24" />
          <span className="btn-text-full">Early Detection</span>
          <span className="btn-text-short">Early AI</span>
        </button>

        {/* Full Lab Suite */}
        <button 
          className="header-action-btn"
          onClick={onOpenLabs}
          title="Full Clinical Laboratory Test Suite"
        >
          <FlaskConical size={14} color="var(--cyan-400)" />
          <span className="btn-text-full">Lab Suite</span>
          <span className="btn-text-short">Labs</span>
        </button>

        {/* Upload Scan */}
        <button 
          className="header-action-btn"
          onClick={onOpenScanUploader}
          title="Upload MRI / CXR / CT Imaging Study"
        >
          <UploadCloud size={14} color="var(--text-secondary)" />
          <span className="btn-text-full">Upload Scan</span>
          <span className="btn-text-short">Upload</span>
        </button>
      </nav>

      {/* Right Controls: Search, Cases, Copilot, Settings, Doctor Profile */}
      <div className="header-controls">
        {/* Search */}
        <div className="search-container">
          <Search size={14} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search patients..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Cases Library */}
        <button 
          className="header-btn" 
          onClick={onOpenCases}
          title="Open Hospital Patient Directory"
        >
          <FolderOpen size={15} />
          <span className="ctrl-btn-text">Cases</span>
        </button>

        {/* Clinical Copilot Trigger */}
        <button 
          className="header-btn" 
          onClick={onToggleCopilot}
          title="Open Clinical AI Copilot"
        >
          <Bot size={15} color="var(--cyan-neon)" />
          <span className="ctrl-btn-text">AI Copilot</span>
        </button>

        {/* Settings Trigger */}
        <button 
          className="header-btn" 
          onClick={onOpenSettings}
          title="Model & Engine Settings"
        >
          <Settings size={15} />
          <span className="ctrl-btn-text">Settings</span>
        </button>

        {/* Physician Profile */}
        <div className="user-profile-wrapper">
          <div 
            className="user-profile-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title="Logged in Physician Profile"
          >
            <div className="user-avatar">{docInitials}</div>
            <div className="user-profile-info">
              <span className="user-profile-name">
                {currentDoctor?.full_name || 'Dr. A. Chen, MD'}
              </span>
              <span className="user-profile-spec">
                {currentDoctor?.specialty || 'Neuro-Radiology'}
              </span>
            </div>
            <ChevronDown size={13} />
          </div>

          {profileDropdownOpen && (
            <div className="profile-dropdown-menu animate-fade-in" onClick={() => setProfileDropdownOpen(false)}>
              <div className="dropdown-doctor-card">
                <Stethoscope size={18} color="var(--cyan-neon)" />
                <div>
                  <strong>{currentDoctor?.full_name || 'Dr. A. Chen, MD'}</strong>
                  <p>{currentDoctor?.specialty || 'Neuro-Radiology & Oncology'}</p>
                  <span>License: {currentDoctor?.license_number || 'MD-89210'}</span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item-btn" onClick={onOpenAuth}>
                <UserCheck size={15} />
                <span>Switch Physician / Register</span>
              </button>

              <button className="dropdown-item-btn" onClick={onOpenNewPatient}>
                <UserPlus size={15} />
                <span>Admit New Patient</span>
              </button>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item-btn logout-text" onClick={onLogout}>
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle (visible on screens <= 920px) */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title="Toggle Clinical Navigation"
          aria-label="Toggle Clinical Navigation"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer/Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-header-menu animate-fade-in">
          <div className="mobile-search-wrapper">
            <Search size={14} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search patients..." 
              className="mobile-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mobile-workflow-info">
            <span className="workflow-label">Current:</span>
            <span className="workflow-patient">{currentCase?.name || 'Sarah Johnson'}</span>
            <span className="workflow-id">({currentCase?.id || 'NL0194'})</span>
            <span className="status-badge-reviewing">
              {currentCase?.status || currentCase?.case_status || 'REVIEWING'}
            </span>
          </div>

          <div className="mobile-menu-grid">
            <button 
              className="mobile-menu-item pulse-glow-btn"
              onClick={() => { onOpenNewPatient(); setMobileMenuOpen(false); }}
            >
              <UserPlus size={15} color="var(--cyan-neon)" />
              <span>+ Admit Patient</span>
            </button>

            <button 
              className="mobile-menu-item"
              onClick={() => { onOpenFamily(); setMobileMenuOpen(false); }}
            >
              <HeartHandshake size={15} color="var(--cyan-neon)" />
              <span>Family Hierarchy {familyCount > 0 && `(${familyCount})`}</span>
            </button>

            <button 
              className="mobile-menu-item"
              onClick={() => { onOpenConsultants(); setMobileMenuOpen(false); }}
            >
              <Users size={15} color="var(--teal-accent)" />
              <span>Care Team {consultantCount > 0 && `(${consultantCount})`}</span>
            </button>

            <button 
              className="mobile-menu-item early-detect-btn"
              onClick={() => { onOpenEarlyDetection(); setMobileMenuOpen(false); }}
            >
              <Zap size={15} color="#fbbf24" />
              <span>Early Detection AI</span>
            </button>

            <button 
              className="mobile-menu-item"
              onClick={() => { onOpenLabs(); setMobileMenuOpen(false); }}
            >
              <FlaskConical size={15} color="var(--cyan-400)" />
              <span>Diagnostic Labs</span>
            </button>

            <button 
              className="mobile-menu-item"
              onClick={() => { onOpenScanUploader(); setMobileMenuOpen(false); }}
            >
              <UploadCloud size={15} color="var(--text-secondary)" />
              <span>Upload Study</span>
            </button>
          </div>

          <div className="mobile-menu-bottom-row">
            <button 
              className="header-btn"
              onClick={() => { onOpenCases(); setMobileMenuOpen(false); }}
            >
              <FolderOpen size={15} />
              <span>Cases</span>
            </button>
            <button 
              className="header-btn"
              onClick={() => { onToggleCopilot(); setMobileMenuOpen(false); }}
            >
              <Bot size={15} color="var(--cyan-neon)" />
              <span>AI Copilot</span>
            </button>
            <button 
              className="header-btn"
              onClick={() => { onOpenSettings(); setMobileMenuOpen(false); }}
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
