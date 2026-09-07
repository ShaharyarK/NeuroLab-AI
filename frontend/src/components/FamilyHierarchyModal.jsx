import React, { useState } from 'react';
import { 
  X, 
  HeartHandshake, 
  Users, 
  ArrowRight, 
  Trash2, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle2, 
  Dna,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function FamilyHierarchyModal({
  isOpen,
  onClose,
  currentCase,
  allPatients = [],
  onSelectPatient,
  onFamilyUpdated
}) {
  const [selectedRelatedId, setSelectedRelatedId] = useState('');
  const [relationshipType, setRelationshipType] = useState('Child (Daughter)');
  const [relationshipNotes, setRelationshipNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentCase) return null;

  const familyMembers = currentCase.family_members || [];
  const linkedIds = familyMembers.map(f => f.related_patient_id);
  const availablePatients = allPatients.filter(p => p.id !== currentCase.id && !linkedIds.includes(p.id));

  const handleAddLink = async () => {
    if (!selectedRelatedId) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          related_patient_id: selectedRelatedId,
          relationship_type: relationshipType,
          notes: relationshipNotes,
          bidirectional: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to link family member');

      setSuccessMsg(data.message || 'Family member linked successfully!');
      onFamilyUpdated && onFamilyUpdated(data.family_members);
      setSelectedRelatedId('');
      setRelationshipNotes('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async (relId) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:511/api/patients/${currentCase.id}/family/${relId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to unlink');

      setSuccessMsg('Family connection unlinked');
      const updated = familyMembers.filter(f => f.id !== relId);
      onFamilyUpdated && onFamilyUpdated(updated);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <HeartHandshake className="modal-icon text-cyan" size={24} />
            <div>
              <h2 className="modal-title">Patient Family & Lineage Hierarchy</h2>
              <p className="modal-subtitle">
                Hereditary tracking, multi-generation family relations, and coordinated pediatric/maternal care
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

        <div className="family-modal-content">
          {/* Current Patient Anchor Card */}
          <div className="current-patient-anchor">
            <div className="anchor-tag">Active Chart (Focus Patient)</div>
            <div className="anchor-info-row">
              <div className="patient-avatar-lg">
                {currentCase.name?.split(' ')?.[0]?.[0] || 'P'}
              </div>
              <div className="patient-main-meta">
                <div className="name-and-id">
                  <h3 className="patient-title-name">{currentCase.name}</h3>
                  <span className="patient-id-tag">{currentCase.id}</span>
                  <span className="status-badge-reviewing">{currentCase.status || currentCase.case_status}</span>
                </div>
                <div className="patient-sub-details">
                  <span><strong>Age:</strong> {currentCase.age}y</span>
                  <span><strong>Gender:</strong> {currentCase.gender}</span>
                  <span><strong>Blood Group:</strong> {currentCase.blood_group || 'A+'}</span>
                  <span><strong>Chief Complaint:</strong> {currentCase.chief_complaint || 'Neuro diagnostic review'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Family Members Tree */}
          <div className="family-tree-section">
            <div className="family-header-row">
              <h4 className="section-subtitle-heading">
                <Dna size={16} color="var(--cyan-neon)" />
                Connected Hospital Family Tree & Kin ({familyMembers.length})
              </h4>
              <span className="family-subnote">1-Click switch to view child, mother or relative's medical chart</span>
            </div>

            {familyMembers.length === 0 ? (
              <div className="empty-consultants-box">
                <Users size={28} color="var(--text-muted)" />
                <p>No family relations registered in this hospital yet.</p>
                <span>Link a child, mother, father, or spouse below to establish reciprocal medical tracking.</span>
              </div>
            ) : (
              <div className="family-cards-list">
                {familyMembers.map((rel) => {
                  const p = rel.related_patient || {};
                  return (
                    <div key={rel.id} className="family-relation-card animate-fade-in">
                      {/* Relation Tag */}
                      <div className="relation-pill-badge">
                        <HeartHandshake size={14} />
                        <span>{rel.relationship_type}</span>
                      </div>

                      <div className="family-card-main">
                        <div className="family-avatar">
                          {p.name?.split(' ')?.[0]?.[0] || 'F'}
                        </div>

                        <div className="family-patient-data">
                          <div className="family-name-line">
                            <h4 className="family-person-name">{p.name || `Patient ${rel.related_patient_id}`}</h4>
                            <span className="family-mrn">{rel.related_patient_id}</span>
                            <span className="family-status-badge">{p.status || 'INPATIENT'}</span>
                          </div>

                          <div className="family-specs-row">
                            <span>{p.age} years old</span>
                            <span className="dot-sep">•</span>
                            <span>{p.gender}</span>
                            <span className="dot-sep">•</span>
                            <span>Blood: {p.blood_group || 'O+'}</span>
                            {p.allergies && p.allergies !== 'NKDA' && (
                              <>
                                <span className="dot-sep">•</span>
                                <span className="allergy-tag">Allergies: {p.allergies}</span>
                              </>
                            )}
                          </div>

                          {rel.notes && (
                            <div className="family-clinical-note">
                              <strong>Clinical Context:</strong> {rel.notes}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="family-card-actions">
                          <button 
                            className="btn-switch-case"
                            onClick={() => {
                              onSelectPatient(rel.related_patient_id);
                              onClose();
                            }}
                            title={`Switch view to ${p.name}'s chart and scans`}
                          >
                            <span>Open Case</span>
                            <ArrowRight size={14} />
                          </button>

                          <button 
                            className="btn-remove-consultant"
                            onClick={() => handleRemoveLink(rel.id)}
                            title="Unlink family relation"
                            disabled={loading}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link New Family Member Form */}
          <div className="add-family-card">
            <h4 className="add-heading">
              <UserPlus size={16} color="var(--cyan-neon)" />
              Link Family Member Admitted in Same Hospital
            </h4>
            <div className="form-row-2col mt-3">
              <div className="form-group">
                <label>Select Admitted Patient *</label>
                <select 
                  value={selectedRelatedId} 
                  onChange={(e) => setSelectedRelatedId(e.target.value)}
                  disabled={availablePatients.length === 0}
                >
                  <option value="">
                    {availablePatients.length === 0 
                      ? 'All available hospital patients are linked' 
                      : '-- Choose patient to link --'}
                  </option>
                  {availablePatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) — {p.age}y {p.gender} ({p.status || p.case_status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Relationship Type (Relative to {currentCase.name}) *</label>
                <select 
                  value={relationshipType} 
                  onChange={(e) => setRelationshipType(e.target.value)}
                >
                  <option value="Child (Daughter)">Child (Daughter)</option>
                  <option value="Child (Son)">Child (Son)</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling (Sister)">Sibling (Sister)</option>
                  <option value="Sibling (Brother)">Sibling (Brother)</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Grandmother">Grandmother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Relative">Other Relative</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Hereditary & Diagnostic Notes (Optional)</label>
              <input 
                type="text" 
                value={relationshipNotes} 
                onChange={(e) => setRelationshipNotes(e.target.value)}
                placeholder="e.g. Biological daughter. Shared genetic predisposition screening requested."
              />
            </div>

            <div className="flex-end mt-2">
              <button 
                className="btn-primary-cyan"
                onClick={handleAddLink}
                disabled={!selectedRelatedId || loading}
              >
                {loading ? 'Linking Hierarchy...' : 'Establish Reciprocal Family Link'}
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
