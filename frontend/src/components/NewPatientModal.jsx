import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  HeartHandshake, 
  AlertCircle, 
  Sparkles, 
  Activity, 
  ShieldAlert, 
  Stethoscope 
} from 'lucide-react';

export default function NewPatientModal({ 
  isOpen, 
  onClose, 
  onPatientAdmitted, 
  allDoctors = [], 
  existingPatients = [],
  currentDoctor 
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Demographics
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [mrn, setMrn] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [allergies, setAllergies] = useState('No known drug allergies (NKDA)');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [caseStatus, setCaseStatus] = useState('REVIEWING');

  // Care Team
  const [attendingDoctorId, setAttendingDoctorId] = useState(currentDoctor?.id || (allDoctors[0]?.id || 1));
  const [selectedConsultants, setSelectedConsultants] = useState([]);

  // Family Hierarchy Linking
  const [linkFamily, setLinkFamily] = useState(false);
  const [relatedPatientId, setRelatedPatientId] = useState('');
  const [relationshipType, setRelationshipType] = useState('Child (Daughter)');
  const [relationshipNotes, setRelationshipNotes] = useState('');

  if (!isOpen) return null;

  const toggleConsultant = (docId) => {
    if (selectedConsultants.includes(docId)) {
      setSelectedConsultants(selectedConsultants.filter(id => id !== docId));
    } else {
      setSelectedConsultants([...selectedConsultants, docId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !age) {
      setErrorMsg('Please specify patient full name and age.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        name: name.trim(),
        age: parseInt(age, 10),
        gender,
        blood_group: bloodGroup,
        mrn: mrn.trim() || undefined,
        contact_number: contactNumber.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        allergies: allergies.trim() || 'No known drug allergies (NKDA)',
        chief_complaint: chiefComplaint.trim() || 'General diagnostic workup',
        case_status: caseStatus,
        attending_doctor_id: parseInt(attendingDoctorId, 10),
        consulting_doctor_ids: selectedConsultants,
        related_to_patient_id: linkFamily && relatedPatientId ? relatedPatientId : undefined,
        relationship_type: linkFamily && relatedPatientId ? relationshipType : undefined,
        relationship_notes: linkFamily && relatedPatientId ? relationshipNotes : undefined
      };

      const res = await fetch('http://localhost:511/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Admission failed');
      }

      setSuccessMsg(`Patient ${data.patient.name} (${data.patient.id}) successfully admitted!`);
      setTimeout(() => {
        onPatientAdmitted(data.patient);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Error admitting patient');
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
            <UserPlus className="modal-icon text-cyan" size={22} />
            <div>
              <h2 className="modal-title">Admit New Hospital Patient</h2>
              <p className="modal-subtitle">Register demographics, medical triage, consulting specialists & family relations</p>
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
            <Sparkles size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="patient-admission-form">
          {/* Section 1: Demographics */}
          <div className="form-section-card">
            <h3 className="section-title">
              <Activity size={16} color="var(--cyan-neon)" />
              1. Patient Demographics & Identification
            </h3>
            <div className="form-row-3col">
              <div className="form-group">
                <label>Full Patient Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emily Watson"
                  required
                />
              </div>

              <div className="form-group">
                <label>Age *</label>
                <input 
                  type="number" 
                  min="0"
                  max="125"
                  value={age} 
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 42"
                  required
                />
              </div>

              <div className="form-group">
                <label>Biological Gender *</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other / Non-Binary</option>
                </select>
              </div>
            </div>

            <div className="form-row-3col">
              <div className="form-group">
                <label>Blood Group</label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Medical Record Number (MRN)</label>
                <input 
                  type="text" 
                  value={mrn} 
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="Auto-generated if blank"
                />
              </div>

              <div className="form-group">
                <label>Admission Triage Status</label>
                <select value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)}>
                  <option value="REVIEWING">REVIEWING (Standard Inpatient)</option>
                  <option value="TRIAGE">TRIAGE (Urgent Observation)</option>
                  <option value="CRITICAL">CRITICAL (ICU / Emergency)</option>
                  <option value="DISCHARGED">DISCHARGED (Outpatient Follow-up)</option>
                </select>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label>Contact Phone</label>
                <input 
                  type="text" 
                  value={contactNumber} 
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact & Kin</label>
                <input 
                  type="text" 
                  value={emergencyContact} 
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. John Watson (Spouse, +1 555-111-2222)"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Details */}
          <div className="form-section-card">
            <h3 className="section-title">
              <Stethoscope size={16} color="var(--cyan-neon)" />
              2. Clinical Complaint & Allergies
            </h3>
            <div className="form-group">
              <label>Drug & Environmental Allergies</label>
              <input 
                type="text" 
                value={allergies} 
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, NSAIDs, Peanuts (or NKDA)"
              />
            </div>

            <div className="form-group">
              <label>Chief Complaint & History of Present Illness (HPI)</label>
              <textarea 
                rows="2"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Describe presenting symptoms, duration, acute onset, or diagnostic imaging referral reason..."
              />
            </div>
          </div>

          {/* Section 3: Care Team & Doctor Assignment */}
          <div className="form-section-card">
            <h3 className="section-title">
              <Users size={16} color="var(--cyan-neon)" />
              3. Multi-Doctor Care Team Assignment
            </h3>
            <div className="form-group">
              <label>Lead / Attending Physician *</label>
              <select 
                value={attendingDoctorId} 
                onChange={(e) => setAttendingDoctorId(e.target.value)}
              >
                {allDoctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} — {doc.specialty} ({doc.hospital_affiliation})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assign Consulting Specialists (Multi-Doctor Collaboration):</label>
              <div className="consultant-checkbox-grid">
                {allDoctors.filter(d => d.id !== parseInt(attendingDoctorId, 10)).map(doc => (
                  <label key={doc.id} className="checkbox-card-item">
                    <input 
                      type="checkbox" 
                      checked={selectedConsultants.includes(doc.id)}
                      onChange={() => toggleConsultant(doc.id)}
                    />
                    <div className="doc-item-text">
                      <span className="doc-name">{doc.full_name}</span>
                      <span className="doc-sub">{doc.specialty}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Patient Family Lineage Hierarchy */}
          <div className="form-section-card highlight-cyan-border">
            <div className="family-toggle-header">
              <div className="family-title-wrap">
                <HeartHandshake size={18} color="var(--cyan-neon)" />
                <div>
                  <h3 className="section-title mb-0">4. Patient Family & Lineage Hierarchy</h3>
                  <p className="section-subtitle">Link this patient to an existing family member in the hospital (e.g. Mother & Child)</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={linkFamily} 
                  onChange={(e) => setLinkFamily(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {linkFamily && (
              <div className="family-link-inputs animate-fade-in">
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Select Related Hospital Patient *</label>
                    <select 
                      value={relatedPatientId} 
                      onChange={(e) => setRelatedPatientId(e.target.value)}
                      required={linkFamily}
                    >
                      <option value="">-- Choose admitted family member --</option>
                      {existingPatients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id}) — Age: {p.age}y ({p.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Relationship to Selected Patient *</label>
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
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Relative">Other Relative</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Family Medical Notes & Hereditary Context</label>
                  <input 
                    type="text" 
                    value={relationshipNotes} 
                    onChange={(e) => setRelationshipNotes(e.target.value)}
                    placeholder="e.g. Mother admitted for glioblastoma; child admitted for baseline neuro-vascular checkup."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-cyan" disabled={loading}>
              {loading ? 'Admitting to Hospital Database...' : 'Confirm Admission & Open Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
