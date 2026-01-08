import React, { useState, useEffect } from 'react';
import './MainContent.css';
import { useForm } from '../context/FormContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EligibilityTab from './EligibilityTab';
import OfferLetterTab from './OfferLetterTab';
import InterviewProcessTab from './InterviewProcessTab';

const MainContent = ({ activeSection, setActiveSection }) => {
  const { state, updateField, updateCheckboxArray, updateSalaryDetails, reorderSections } = useForm();
  const [activeTab, setActiveTab] = useState('Eligibility'); // Setting 'Eligibility' as active for now to show the new page
  const [expandedSections, setExpandedSections] = useState({
    'company-information': true,
    'drive-information': false,
    'profile-salary-information': false
  });

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderSections(result.source.index, result.destination.index);
  };

  // Automatically expand the active section when it changes
  useEffect(() => {
    setExpandedSections(prev => ({
      ...Object.keys(prev).reduce((acc, key) => {
        acc[key] = key === activeSection;
        return acc;
      }, {})
    }));
  }, [activeSection]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    // Update the active section - only affects the right sidebar now
    setActiveSection(section);
  };

  const handleInputChange = (section, field, value) => {
    updateField(section, field, value);
  };

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'company-information':
        return (
          <div className="form-content">
            <div className="form-row">
              <label>Company Name:</label>
              <input
                type="text"
                placeholder="Enter company name"
                value={state.companyInformation.companyName}
                onChange={(e) => handleInputChange('companyInformation', 'companyName', e.target.value)}
              />
              {state.errors.companyName && <span className="error">{state.errors.companyName}</span>}
            </div>
            <div className="form-row">
              <label>Website of Company:</label>
              <input
                type="text"
                placeholder="Enter company website"
                value={state.companyInformation.industry}
                onChange={(e) => handleInputChange('companyInformation', 'industry', e.target.value)}
              />
              {state.errors.industry && <span className="error">{state.errors.industry}</span>}
            </div>
            <div className="form-row">
              <label>Location of Company:</label>
              <input
                type="text"
                placeholder="Enter company location"
                value={state.companyInformation.location}
                onChange={(e) => handleInputChange('companyInformation', 'location', e.target.value)}
              />
              {state.errors.location && <span className="error">{state.errors.location}</span>}
            </div>
            <div className="form-row">
              <label>Drive Category:</label>
              <div className="custom-select-box">
                <select
                  value={state.companyInformation.driveCategory}
                  onChange={(e) => handleInputChange('companyInformation', 'driveCategory', e.target.value)}
                >
                  <option value="Core">Core</option>
                  <option value="IT">IT</option>
                  <option value="Non Tech">Non Tech</option>
                  <option value="Service">Service</option>
                </select>
                <i className="fas fa-chevron-down select-caret"></i>
              </div>
              {state.errors.companyDriveCategory && <span className="error">{state.errors.companyDriveCategory}</span>}
            </div>
            <div className="form-row">
              <label>Placement Category:</label>
              <div className="custom-select-box">
                <select
                  value={state.companyInformation.placementCategory}
                  onChange={(e) => handleInputChange('companyInformation', 'placementCategory', e.target.value)}
                >
                  <option value="Dream">Dream</option>
                  <option value="Standard">Standard</option>
                  <option value="Super Dream">Super Dream</option>
                </select>
                <i className="fas fa-chevron-down select-caret"></i>
              </div>
              {state.errors.placementCategory && <span className="error">{state.errors.placementCategory}</span>}
            </div>
          </div>
        );
      case 'drive-information':
        return (
          <div className="form-content">
            <div className="form-row">
              <label>Drive Name:</label>
              <input
                type="text"
                placeholder="Enter drive name"
                value={state.driveInformation.driveName}
                onChange={(e) => handleInputChange('driveInformation', 'driveName', e.target.value)}
              />
              {state.errors.driveName && <span className="error">{state.errors.driveName}</span>}
            </div>
            <div className="form-row">
              <label>Drive Type:</label>
              <div className="custom-select-box">
                <select
                  value={state.driveInformation.driveType[0] || ''}
                  onChange={(e) => handleInputChange('driveInformation', 'driveType', [e.target.value])}
                >
                  <option value="">Select Drive Type</option>
                  {['Freelance', 'Full Time', 'Internship', 'Internship & Full Time', 'Internship to Full Time', 'Part Time'].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down select-caret"></i>
              </div>
              {state.errors.driveType && <span className="error">{state.errors.driveType}</span>}
            </div>
            <div className="form-row">
              <label>Drive Description:</label>
              <textarea
                placeholder="Enter drive description"
                value={state.driveInformation.driveDescription}
                onChange={(e) => handleInputChange('driveInformation', 'driveDescription', e.target.value)}
              ></textarea>
            </div>
            <div className="form-row">
              <label>Agreement (Months):</label>
              <div className="custom-select-box">
                <select
                  value={state.driveInformation.agreement}
                  onChange={(e) => handleInputChange('driveInformation', 'agreement', e.target.value)}
                >
                  {Array.from({ length: 101 }, (_, i) => (
                    <option key={i} value={i.toString()}>
                      {i === 0 ? 'No Agreement' : `${i} Month${i > 1 ? 's' : ''}`}
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down select-caret"></i>
              </div>
            </div>
            <div className="form-row">
              <label>Drive Attachments:</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                onChange={(e) => handleInputChange('driveInformation', 'driveAttachments', e.target.files)}
              />
              <small className="file-help">Upload documents, images, or other relevant files (PDF, DOC, JPG, PNG, TXT)</small>
            </div>
            <div className="form-row">
              <label>Drive SPOC:</label>
              <input
                type="text"
                placeholder="Enter Single Point of Contact details"
                value={state.driveInformation.driveSpoc}
                onChange={(e) => handleInputChange('driveInformation', 'driveSpoc', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Drive Date:</label>
              <input
                type="date"
                value={state.driveInformation.driveDate}
                onChange={(e) => handleInputChange('driveInformation', 'driveDate', e.target.value)}
              />
              {state.errors.driveDate && <span className="error">{state.errors.driveDate}</span>}
            </div>
            <div className="form-row">
              <label>Number of Rounds:</label>
              <div className="custom-select-box">
                <select
                  value={state.driveInformation.numberOfRounds}
                  onChange={(e) => handleInputChange('driveInformation', 'numberOfRounds', e.target.value)}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>
                      {i + 1} Round{i + 1 > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down select-caret"></i>
              </div>
              {state.errors.numberOfRounds && <span className="error">{state.errors.numberOfRounds}</span>}
            </div>
            <div className="form-row">
              <label>Optional Information:</label>
              <textarea
                placeholder="Enter any optional information"
                value={state.driveInformation.optionalInformation}
                onChange={(e) => handleInputChange('driveInformation', 'optionalInformation', e.target.value)}
              ></textarea>
            </div>
          </div>
        );
      case 'profile-salary-information':
        return (
          <div className="form-content">
            <div className="form-row">
              <label>Profile and Designation:</label>
              <input
                type="text"
                placeholder="Enter profile and designation"
                value={state.profileSalaryInformation.profile}
                onChange={(e) => handleInputChange('profileSalaryInformation', 'profile', e.target.value)}
              />
            </div>

            {/* Toggle for Degree-based Salary */}
            <div className="form-row">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={state.profileSalaryInformation.showDegreeBasedSalary}
                  onChange={(e) => handleInputChange('profileSalaryInformation', 'showDegreeBasedSalary', e.target.checked)}
                />
                <span className="toggle-text">Enable Degree-based Salary/Stipend Information</span>
              </label>
              <small className="helper-text">Check this if you want to specify different salary/stipend for different degrees</small>
            </div>

            <div className="form-row job-title-row">
              <div className="job-title-input">
                <label>Job Title:</label>
                <input
                  type="text"
                  placeholder="Enter job title"
                  value={state.profileSalaryInformation.jobTitle}
                  onChange={(e) => handleInputChange('profileSalaryInformation', 'jobTitle', e.target.value)}
                />
              </div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.profileSalaryInformation.hasSalary}
                    onChange={(e) => handleInputChange('profileSalaryInformation', 'hasSalary', e.target.checked)}
                  />
                  Salary
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.profileSalaryInformation.hasStipend}
                    onChange={(e) => handleInputChange('profileSalaryInformation', 'hasStipend', e.target.checked)}
                  />
                  Stipend
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.profileSalaryInformation.toBeAnnounced}
                    onChange={(e) => handleInputChange('profileSalaryInformation', 'toBeAnnounced', e.target.checked)}
                  />
                  To Be Announced
                </label>
              </div>
            </div>

            {/* Salary Details - Show when salary checkbox is checked AND To Be Announced is NOT checked */}
            {state.profileSalaryInformation.hasSalary && !state.profileSalaryInformation.toBeAnnounced && (
              <div className="salary-input-section">
                <div className="salary-inputs">
                  <div className="salary-field">
                    <label>Annual Salary:</label>
                    <input
                      type="text"
                      placeholder="Enter annual salary"
                      value={state.profileSalaryInformation.annualSalary}
                      onChange={(e) => handleInputChange('profileSalaryInformation', 'annualSalary', e.target.value)}
                    />
                  </div>
                  <div className="salary-field">
                    <label>Monthly Salary:</label>
                    <input
                      type="text"
                      placeholder="Enter monthly salary"
                      value={state.profileSalaryInformation.monthlySalary}
                      onChange={(e) => handleInputChange('profileSalaryInformation', 'monthlySalary', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stipend Details - Show when stipend checkbox is checked AND To Be Announced is NOT checked */}
            {state.profileSalaryInformation.hasStipend && !state.profileSalaryInformation.toBeAnnounced && (
              <div className="stipend-input-section">
                <div className="stipend-inputs">
                  <div className="stipend-field">
                    <label>Annual Stipend:</label>
                    <input
                      type="text"
                      placeholder="Enter annual stipend"
                      value={state.profileSalaryInformation.annualStipend}
                      onChange={(e) => handleInputChange('profileSalaryInformation', 'annualStipend', e.target.value)}
                    />
                  </div>
                  <div className="stipend-field">
                    <label>Monthly Stipend:</label>
                    <input
                      type="text"
                      placeholder="Enter monthly stipend"
                      value={state.profileSalaryInformation.monthlyStipend}
                      onChange={(e) => handleInputChange('profileSalaryInformation', 'monthlyStipend', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Degree-based Salary Section - Only show if enabled */}
            {state.profileSalaryInformation.showDegreeBasedSalary && (
              <div className="form-section">
                <h3>Degree-based Salary/Stipend Information</h3>

                {/* B.Tech Section */}
                <div className="degree-section">
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.profileSalaryInformation.salaryDetails.btech.enabled}
                        onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'btech', 'enabled', e.target.checked)}
                      />
                      B.Tech
                    </label>
                  </div>

                  {state.profileSalaryInformation.salaryDetails.btech.enabled && (
                    <div className="salary-details">
                      <div className="form-row">
                        <label>B.Tech Salary (LPA):</label>
                        <input
                          type="number"
                          placeholder="Enter salary in LPA"
                          value={state.profileSalaryInformation.salaryDetails.btech.salary}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'btech', 'salary', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>B.Tech Stipend (per month):</label>
                        <input
                          type="number"
                          placeholder="Enter stipend per month"
                          value={state.profileSalaryInformation.salaryDetails.btech.stipend}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'btech', 'stipend', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* M.Tech Section */}
                <div className="degree-section">
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.profileSalaryInformation.salaryDetails.mtech.enabled}
                        onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mtech', 'enabled', e.target.checked)}
                      />
                      M.Tech
                    </label>
                  </div>

                  {state.profileSalaryInformation.salaryDetails.mtech.enabled && (
                    <div className="salary-details">
                      <div className="form-row">
                        <label>M.Tech Salary (LPA):</label>
                        <input
                          type="number"
                          placeholder="Enter salary in LPA"
                          value={state.profileSalaryInformation.salaryDetails.mtech.salary}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mtech', 'salary', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>M.Tech Stipend (per month):</label>
                        <input
                          type="number"
                          placeholder="Enter stipend per month"
                          value={state.profileSalaryInformation.salaryDetails.mtech.stipend}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mtech', 'stipend', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* MBA Section */}
                <div className="degree-section">
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.profileSalaryInformation.salaryDetails.mba.enabled}
                        onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mba', 'enabled', e.target.checked)}
                      />
                      MBA
                    </label>
                  </div>

                  {state.profileSalaryInformation.salaryDetails.mba.enabled && (
                    <div className="salary-details">
                      <div className="form-row">
                        <label>MBA Salary (LPA):</label>
                        <input
                          type="number"
                          placeholder="Enter salary in LPA"
                          value={state.profileSalaryInformation.salaryDetails.mba.salary}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mba', 'salary', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>MBA Stipend (per month):</label>
                        <input
                          type="number"
                          placeholder="Enter stipend per month"
                          value={state.profileSalaryInformation.salaryDetails.mba.stipend}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'mba', 'stipend', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PhD Section */}
                <div className="degree-section">
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.profileSalaryInformation.salaryDetails.phd.enabled}
                        onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'phd', 'enabled', e.target.checked)}
                      />
                      PhD
                    </label>
                  </div>

                  {state.profileSalaryInformation.salaryDetails.phd.enabled && (
                    <div className="salary-details">
                      <div className="form-row">
                        <label>PhD Salary (LPA):</label>
                        <input
                          type="number"
                          placeholder="Enter salary in LPA"
                          value={state.profileSalaryInformation.salaryDetails.phd.salary}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'phd', 'salary', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>PhD Stipend (per month):</label>
                        <input
                          type="number"
                          placeholder="Enter stipend per month"
                          value={state.profileSalaryInformation.salaryDetails.phd.stipend}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'phd', 'stipend', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Degree Section */}
                <div className="degree-section custom-degree">
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={state.profileSalaryInformation.salaryDetails.custom.enabled}
                        onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'custom', 'enabled', e.target.checked)}
                      />
                      Custom Degree
                    </label>
                  </div>

                  {state.profileSalaryInformation.salaryDetails.custom.enabled && (
                    <div className="salary-details">
                      <div className="form-row">
                        <label>Degree Name:</label>
                        <input
                          type="text"
                          placeholder="Enter custom degree name (e.g., B.Sc, M.Sc, Diploma, etc.)"
                          value={state.profileSalaryInformation.salaryDetails.custom.degreeName}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'custom', 'degreeName', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>{state.profileSalaryInformation.salaryDetails.custom.degreeName || 'Custom Degree'} Salary (LPA):</label>
                        <input
                          type="number"
                          placeholder="Enter salary in LPA"
                          value={state.profileSalaryInformation.salaryDetails.custom.salary}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'custom', 'salary', e.target.value)}
                        />
                      </div>
                      <div className="form-row">
                        <label>{state.profileSalaryInformation.salaryDetails.custom.degreeName || 'Custom Degree'} Stipend (per month):</label>
                        <input
                          type="number"
                          placeholder="Enter stipend per month"
                          value={state.profileSalaryInformation.salaryDetails.custom.stipend}
                          onChange={(e) => updateSalaryDetails('profileSalaryInformation', 'custom', 'stipend', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <div>Select a section to view content</div>;
    }
  };


  const tabs = [
    'Drive Summary',
    'Drive Details',
    'Eligibility',
    'Interview Process',
    'Offer Repository',
    'Email Template'
  ];

  return (
    <div className="main-content">
      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
          <div className="status-badge-container">
            <span className="status-badge ongoing">Ongoing</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="republish-btn"><i className="fas fa-sync-alt"></i> Republish</button>
        </div>
      </div>

      {activeTab === 'Drive Details' && (
        <div className="content-area">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections-list">
              {(provided) => (
                <div className="left-sidebar" {...provided.droppableProps} ref={provided.innerRef}>
                  {state.sections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided) => (
                        <div
                          className="section-item-wrapper"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="section-item">
                            <div
                              className={`section-header ${section.id === activeSection ? 'active' : ''}`}
                              onClick={() => toggleSection(section.id)}
                            >
                              <div className="section-drag-handle" {...provided.dragHandleProps}>
                                <i className="fas fa-grip-lines"></i>
                              </div>
                              <span className="section-title">{section.title}</span>
                              <span className="expand-icon">
                                {expandedSections[section.id] ? '▼' : '▶'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="right-content">
            <div className="section-content">
              <div className="section-header-main">
                <span className="expand-icon">▶</span>
                <h3>{state.sections.find(s => s.id === activeSection)?.title}</h3>
              </div>

              {expandedSections[activeSection] && renderSectionContent(activeSection)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Eligibility' && (
        <div className="content-area scrollable">
          <EligibilityTab />
        </div>
      )}

      {activeTab === 'Interview Process' && (
        <div className="content-area">
          <InterviewProcessTab />
        </div>
      )}

      {activeTab === 'Offer Repository' && (
        <div className="content-area">
          <OfferLetterTab />
        </div>
      )}

      {activeTab !== 'Drive Details' && activeTab !== 'Eligibility' && activeTab !== 'Offer Repository' && activeTab !== 'Interview Process' && (
        <div className="content-placeholder">
          <h3>{activeTab} Content</h3>
          <p>This section is under development.</p>
        </div>
      )}
    </div>
  );
};

export default MainContent;