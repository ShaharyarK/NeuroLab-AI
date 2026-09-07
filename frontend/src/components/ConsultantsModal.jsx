import React, { useState } from 'react';
import { X, Users, UserPlus, Trash2, Award, Building, Stethoscope, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ConsultantsModal({
  isOpen,
  onClose,
  currentCase,
  allDoctors = [],
  onCareTeamUpdated
}) {
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentCase) return null;

  const attendingDoctor = currentCase.attending_doctor || {
    full_name: 'Dr. A. Chen, MD',
    specialty: 'Neuro-Radiology & Oncology',
    hospital_affiliation: 'St. Jude Neuro-Diagnostics Center'
  };

  const consultingDoctors = currentCase.consulting_doctors || [];
  const assignedIds = consultingDoctors.map(d => d.id);
  const availableDoctors = allDoctors.filter(d => 
    d.id !== attendingDoctor.id && !assignedIds.includes(d.id)
  );

  const handleAddConsultant = async () => {
    if (!selectedDoctorId) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/consultants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: parseInt(selectedDoctorId, 10) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add consultant');

      setSuccessMsg(data.message || 'Consulting physician added!');
      onCareTeamUpdated && onCareTeamUpdated(data.consulting_doctors);
      setSelectedDoctorId('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConsultant = async (docId) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/consultants/${docId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to remove consultant');

      setSuccessMsg('Consultant removed from care team');
      onCareTeamUpdated && onCareTeamUpdated(data.consulting_doctors);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container medium-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Users className="modal-icon text-cyan" size={22} />
            <div>
              <h2 className="modal-title">Multi-Doctor Care Team Collaboration</h2>
              <p className="modal-subtitle">
                Cross-specialist clinical consultation for Patient {currentCase.name} ({currentCase.id})
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="care-team-content">
          {/* Attending Doctor */}
          <div className="lead-doctor-card">
            <div className="doctor-badge-tag">Attending Physician (Lead)</div>
            <div className="doctor-card-body">
              <div className="doctor-avatar lead-avatar">
                {attendingDoctor.full_name?.split(' ')?.[1]?.[0] || 'DR'}
              </div>
              <div className="doctor-details">
                <h4 className="doc-name">{attendingDoctor.full_name}</h4>
                <p className="doc-specialty text-cyan">{attendingDoctor.specialty}</p>
                <div className="doc-meta-row">
                  <span><Award size={12} /> {attendingDoctor.license_number || 'MD-ACTIVE'}</span>
                  <span><Building size={12} /> {attendingDoctor.hospital_affiliation || 'St. Jude Center'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consulting Specialists List */}
          <div className="consultants-section">
            <h4 className="section-subtitle-heading">
              Assigned Consulting Specialists ({consultingDoctors.length})
            </h4>

            {consultingDoctors.length === 0 ? (
              <div className="empty-consultants-box">
                <Stethoscope size={24} color="var(--text-muted)" />
                <p>No consulting doctors currently assigned to this patient case.</p>
                <span>Add an oncologist, pulmonologist, or pathologist below for collaborative diagnostics.</span>
              </div>
            ) : (
              <div className="consultants-grid">
                {consultingDoctors.map((doc) => (
                  <div key={doc.id} className="consultant-card">
                    <div className="consultant-info">
                      <div className="doc-avatar sm-avatar">
                        {doc.full_name?.split(' ')?.[1]?.[0] || 'MD'}
                      </div>
                      <div>
                        <h5 className="doc-name-sm">{doc.full_name}</h5>
                        <p className="doc-spec-sm">{doc.specialty}</p>
                        <span className="doc-hosp-sm">{doc.hospital_affiliation}</span>
                      </div>
                    </div>
                    <button 
                      className="btn-remove-consultant"
                      onClick={() => handleRemoveConsultant(doc.id)}
                      title="Remove consultant from case"
                      disabled={loading}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Consultant Action */}
          <div className="add-consultant-card">
            <h4 className="add-heading">
              <UserPlus size={16} color="var(--cyan-neon)" />
              Add Another Doctor to This Patient Case
            </h4>
            <div className="add-consultant-row">
              <select 
                value={selectedDoctorId} 
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={availableDoctors.length === 0}
              >
                <option value="">
                  {availableDoctors.length === 0 
                    ? 'All registered hospital specialists are already assigned' 
                    : '-- Select specialist to assign --'}
                </option>
                {availableDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} — {doc.specialty} ({doc.hospital_affiliation})
                  </option>
                ))}
              </select>

              <button 
                className="btn-primary-cyan btn-add-doc"
                onClick={handleAddConsultant}
                disabled={!selectedDoctorId || loading}
              >
                {loading ? 'Assigning...' : 'Assign Doctor'}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions-footer">
          <button type="button" className="btn-primary-cyan" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
