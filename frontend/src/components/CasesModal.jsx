import React, { useState } from 'react';
import { 
  X, 
  FolderOpen, 
  User, 
  Calendar, 
  Activity, 
  Plus, 
  Search, 
  Users, 
  HeartHandshake,
  Stethoscope,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CasesModal({ 
  isOpen, 
  onClose, 
  cases = [], 
  activeCaseId, 
  currentDoctor,
  onSelectCase, 
  onOpenNewPatient 
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMyPatients, setFilterMyPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredCases = cases.filter(c => {
    // Status filter
    if (filterStatus !== 'ALL') {
      const st = (c.status || c.case_status || '').toUpperCase();
      if (st !== filterStatus) return false;
    }

    // My patients filter
    if (filterMyPatients && currentDoctor) {
      const isAttending = c.attending_doctor?.id === currentDoctor.id || c.attending_doctor_id === currentDoctor.id;
      const isConsulting = c.consulting_doctors?.some(d => d.id === currentDoctor.id);
      if (!isAttending && !isConsulting) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchId = c.id?.toLowerCase().includes(q);
      const matchComplaint = c.chief_complaint?.toLowerCase().includes(q);
      const matchDoc = c.attending_doctor?.full_name?.toLowerCase().includes(q);
      return matchName || matchId || matchComplaint || matchDoc;
    }

    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FolderOpen className="modal-icon text-cyan" size={22} />
            <div>
              <h2 className="modal-title">Hospital Patient Directory & Diagnostic Cases</h2>
              <p className="modal-subtitle">
                PostgreSQL repository of clinical cases, multi-doctor care teams & family lineages
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search, Filters, New Patient */}
        <div className="cases-filter-toolbar">
          <div className="cases-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search by patient name, ID, condition, or doctor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="cases-filter-chips">
            <button 
              className={`case-filter-chip ${filterStatus === 'ALL' && !filterMyPatients ? 'active' : ''}`}
              onClick={() => { setFilterStatus('ALL'); setFilterMyPatients(false); }}
            >
              All Cases ({cases.length})
            </button>
            <button 
              className={`case-filter-chip ${filterMyPatients ? 'active' : ''}`}
              onClick={() => setFilterMyPatients(!filterMyPatients)}
            >
              <Stethoscope size={13} />
              <span>My Patients</span>
            </button>
            <button 
              className={`case-filter-chip ${filterStatus === 'REVIEWING' ? 'active' : ''}`}
              onClick={() => setFilterStatus('REVIEWING')}
            >
              Reviewing
            </button>
            <button 
              className={`case-filter-chip ${filterStatus === 'TRIAGE' ? 'active' : ''}`}
              onClick={() => setFilterStatus('TRIAGE')}
            >
              Triage
            </button>
            <button 
              className={`case-filter-chip ${filterStatus === 'DISCHARGED' ? 'active' : ''}`}
              onClick={() => setFilterStatus('DISCHARGED')}
            >
              Discharged
            </button>
          </div>

          <button 
            className="btn-primary-cyan btn-sm-admit"
            onClick={() => {
              onClose();
              onOpenNewPatient && onOpenNewPatient();
            }}
          >
            <Plus size={15} />
            <span>Admit Patient</span>
          </button>
        </div>

        {/* Cases List */}
        <div className="cases-list-scrollable">
          {filteredCases.length === 0 ? (
            <div className="empty-consultants-box py-8">
              <User size={32} color="var(--text-muted)" />
              <p>No matching patient cases found in database.</p>
              <span>Try adjusting your search criteria or click "Admit Patient" to register a new case.</span>
            </div>
          ) : (
            filteredCases.map(c => {
              const isActive = c.id === activeCaseId;
              const familyCount = c.family_members?.length || 0;
              const consultantCount = c.consulting_doctors?.length || 0;
              const statusStr = c.status || c.case_status || 'REVIEWING';

              return (
                <div 
                  key={c.id} 
                  className={`case-record-card ${isActive ? 'is-active-case' : ''}`}
                  onClick={() => {
                    onSelectCase(c);
                    onClose();
                  }}
                >
                  <div className="case-card-left">
                    <div className="case-avatar">
                      {c.name?.split(' ')?.[0]?.[0] || 'P'}
                    </div>
                    <div className="case-meta-block">
                      <div className="case-name-row">
                        <h4 className="case-patient-name">{c.name}</h4>
                        <span className="case-id-badge">{c.id}</span>
                        <span className={`case-status-pill ${statusStr.toLowerCase()}`}>
                          {statusStr}
                        </span>
                        {isActive && <span className="active-tag-label">CURRENT</span>}
                      </div>

                      <div className="case-sub-specs">
                        <span>{c.age} yrs • {c.gender} • Blood: {c.blood_group || 'O+'}</span>
                        <span className="dot-sep">•</span>
                        <span>Adm: {c.admission_date || '2024-08-10'}</span>
                        <span className="dot-sep">•</span>
                        <span>Attending: <strong>{c.attending_doctor?.full_name || c.physician || 'Dr. A. Chen'}</strong></span>
                      </div>

                      <p className="case-complaint-snippet">
                        {c.chief_complaint || c.mri?.detection || 'Comprehensive diagnostic workup'}
                      </p>
                    </div>
                  </div>

                  {/* Badges Right */}
                  <div className="case-card-badges">
                    {familyCount > 0 && (
                      <div className="family-count-indicator" title={`${familyCount} connected family members`}>
                        <HeartHandshake size={14} color="var(--cyan-neon)" />
                        <span>{familyCount} Kin</span>
                      </div>
                    )}

                    {consultantCount > 0 && (
                      <div className="careteam-count-indicator" title={`${consultantCount} consulting doctors`}>
                        <Users size={14} color="var(--teal-accent)" />
                        <span>{consultantCount} Doctors</span>
                      </div>
                    )}

                    <button className="btn-select-case">
                      {isActive ? 'Active' : 'Open Case'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-actions-footer">
          <button type="button" className="btn-primary-cyan" onClick={onClose}>
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}
