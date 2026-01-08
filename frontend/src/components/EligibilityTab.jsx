import React, { useState, useRef, useEffect } from 'react';
import './EligibilityTab.css';
import { useForm } from '../context/FormContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const MultiSelectDropdown = ({ options, selected, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const toggleOption = (option) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className="custom-select-box" ref={wrapperRef} onClick={() => setIsOpen(!isOpen)}>
            <div className="multi-select-value">
                {selected.length > 0 ? `${selected.length} items selected` : `Select ${label}`}
            </div>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} select-caret`}></i>

            {isOpen && (
                <div className="dropdown-menu">
                    {options.map(option => (
                        <div
                            key={option}
                            className={`dropdown-item ${selected.includes(option) ? 'selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleOption(option);
                            }}
                        >
                            <input type="checkbox" checked={selected.includes(option)} readOnly />
                            <span>{option}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const EligibilityTab = () => {
    const { state, reorderCriteria, updateCriteria } = useForm();
    const [expandedIds, setExpandedIds] = useState(['criteria-1']);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        reorderCriteria(result.source.index, result.destination.index);
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCriteriaUpdate = (id, field, value) => {
        updateCriteria(id, { [field]: value });
    };

    const handleNestedUpdate = (id, parentField, field, value) => {
        const criteria = state.eligibility.criteriaList.find(c => c.id === id);
        const updatedParent = { ...criteria[parentField], [field]: value };
        updateCriteria(id, { [parentField]: updatedParent });
    };

    // Helper to genericize adding filters
    const handleAddFilter = (id, filterType) => {
        const criteria = state.eligibility.criteriaList.find(c => c.id === id);
        const currentFilters = criteria[filterType] || [];
        // For demo, we just add a placeholder filter. In a real app, this would pick from a list.
        const newFilter = { id: Date.now(), name: 'New Filter', value: '' };
        updateCriteria(id, { [filterType]: [...currentFilters, newFilter] });
    };

    const educationOptions = ['10th', '12th', 'UG', 'PG', 'Diploma'];
    const genderOptions = ['Male', 'Female', 'Other'];
    const studentTypeOptions = ['Regular', 'Lateral'];

    return (
        <div className="eligibility-container">
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="criteria-list">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                            {state.eligibility.criteriaList.map((criteria, index) => (
                                <Draggable key={criteria.id} draggableId={criteria.id} index={index}>
                                    {(provided) => (
                                        <div
                                            className="criteria-card-wrapper"
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                        >
                                            <div className="criteria-card-header">
                                                <div className="header-left">
                                                    <div className="drag-handle" {...provided.dragHandleProps}>
                                                        <i className="fas fa-grip-vertical"></i>
                                                    </div>
                                                    <span className="criteria-title">{criteria.title}</span>
                                                </div>
                                                <div className="header-actions">
                                                    <button className="icon-btn" title="View"><i className="far fa-eye"></i></button>
                                                    <button className="icon-btn delete" title="Delete"><i className="far fa-trash-alt"></i></button>
                                                    <button
                                                        className={`icon-btn expand ${expandedIds.includes(criteria.id) ? 'active' : ''}`}
                                                        onClick={() => toggleExpand(criteria.id)}
                                                    >
                                                        <i className="fas fa-chevron-down"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedIds.includes(criteria.id) && (
                                                <div className="criteria-content">
                                                    {/* Template Selection */}
                                                    <div className="template-selection-row">
                                                        <div className="form-field">
                                                            <label className="field-label">Choose from Template</label>
                                                            <div className="custom-select-box">
                                                                <select
                                                                    value={criteria.chooseFromTemplate}
                                                                    onChange={(e) => handleCriteriaUpdate(criteria.id, 'chooseFromTemplate', e.target.value)}
                                                                >
                                                                    <option value="Templates">Templates</option>
                                                                    <option value="Template 1">Template 1</option>
                                                                </select>
                                                                <i className="fas fa-chevron-down select-caret"></i>
                                                            </div>
                                                        </div>
                                                        <div className="template-actions">
                                                            <button className="clear-btn-secondary">Clear Selection</button>
                                                            <button className="save-template-btn">Save Template</button>
                                                        </div>
                                                    </div>

                                                    {/* Student Details */}
                                                    <div className="criteria-section">
                                                        <h3 className="section-title">Student Details</h3>
                                                        <div className="form-row-flexible">
                                                            <div className="form-field">
                                                                <label className="field-label">Pass Out Year*</label>
                                                                <div className="custom-select-box small">
                                                                    <select
                                                                        value={criteria.passOutYear}
                                                                        onChange={(e) => handleCriteriaUpdate(criteria.id, 'passOutYear', e.target.value)}
                                                                    >
                                                                        <option value="2026">2026</option>
                                                                        <option value="2025">2025</option>
                                                                    </select>
                                                                    <i className="fas fa-chevron-down select-caret"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="programmes-btn-wrapper">
                                                            <button className="configure-programmes-btn">
                                                                <i className="far fa-list-alt"></i>
                                                                Configure Programmes Offered
                                                                <span className="count-badge">{criteria.programmesOffered}</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Educational Details */}
                                                    <div className="criteria-section">
                                                        <h3 className="section-title">Educational Details</h3>
                                                        <div className="divider"></div>

                                                        <div className="filter-controls-inline">
                                                            <div className="form-field">
                                                                <label className="field-label">Filter Type</label>
                                                                <div className="custom-select-box">
                                                                    <select
                                                                        value={criteria.educationalDetails.filterType}
                                                                        onChange={(e) => handleNestedUpdate(criteria.id, 'educationalDetails', 'filterType', e.target.value)}
                                                                    >
                                                                        <option value="Individual">Individual</option>
                                                                        <option value="Group">Group</option>
                                                                    </select>
                                                                    <i className="fas fa-chevron-down select-caret"></i>
                                                                </div>
                                                            </div>
                                                            <div className="form-field">
                                                                <label className="field-label">Select Education*</label>
                                                                <MultiSelectDropdown
                                                                    options={educationOptions}
                                                                    selected={criteria.educationalDetails.educationList}
                                                                    onChange={(val) => handleNestedUpdate(criteria.id, 'educationalDetails', 'educationList', val)}
                                                                    label="Education"
                                                                />
                                                            </div>
                                                            <div className="clear-selection-wrapper">
                                                                <button
                                                                    className="clear-btn-secondary red"
                                                                    onClick={() => handleNestedUpdate(criteria.id, 'educationalDetails', 'educationList', [])}
                                                                >
                                                                    <i className="fas fa-times"></i> Clear Selection
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="edu-records-list">
                                                            {criteria.educationalDetails.educationList.map((edu) => {
                                                                // Simple mapping to state keys. In real app might be more dynamic
                                                                // Only map 10th, 12th, UG for now as they are in the context
                                                                if (!['10th', '12th', 'UG'].includes(edu)) return null;

                                                                const percentageKey = edu === '10th' ? 'tenthPercentage' : (edu === '12th' ? 'twelfthPercentage' : 'ugPercentage');
                                                                const cgpaKey = edu === '10th' ? 'tenthCgpa' : (edu === '12th' ? 'twelfthCgpa' : 'ugCgpa');

                                                                return (
                                                                    <div className="edu-record-row" key={edu}>
                                                                        <span className="edu-label">{edu}</span>
                                                                        <div className="edu-inputs">
                                                                            <div className="composite-input">
                                                                                <select className="comp-op"><option>Greater than or equal to</option></select>
                                                                                <input
                                                                                    type="number"
                                                                                    value={criteria.educationalDetails[percentageKey] || ''}
                                                                                    onChange={(e) => handleNestedUpdate(criteria.id, 'educationalDetails', percentageKey, e.target.value)}
                                                                                    className="comp-val"
                                                                                />
                                                                                <span className="comp-unit">%</span>
                                                                            </div>
                                                                            <div className="composite-input">
                                                                                <select className="comp-op"><option>Greater than or equal to</option></select>
                                                                                <input
                                                                                    type="number"
                                                                                    value={criteria.educationalDetails[cgpaKey] || ''}
                                                                                    onChange={(e) => handleNestedUpdate(criteria.id, 'educationalDetails', cgpaKey, e.target.value)}
                                                                                    className="comp-val"
                                                                                />
                                                                                <span className="comp-unit">CGPA</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Backlogs */}
                                                        <div className="backlogs-grid">
                                                            <div className="form-field">
                                                                <label className="field-label">Allow Current Backlogs upto</label>
                                                                <input
                                                                    type="number"
                                                                    className="standard-input"
                                                                    value={criteria.backlogDetails.allowCurrentBacklogsUpto}
                                                                    onChange={(e) => handleNestedUpdate(criteria.id, 'backlogDetails', 'allowCurrentBacklogsUpto', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="form-field">
                                                                <label className="field-label">Allow Students with History of Backlogs</label>
                                                                <div className="custom-select-box">
                                                                    <select
                                                                        value={criteria.backlogDetails.allowHistoryOfBacklogs}
                                                                        onChange={(e) => handleNestedUpdate(criteria.id, 'backlogDetails', 'allowHistoryOfBacklogs', e.target.value)}
                                                                    >
                                                                        <option value="Yes">Yes</option>
                                                                        <option value="No">No</option>
                                                                    </select>
                                                                    <i className="fas fa-chevron-down select-caret"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Personal Profile Filters */}
                                                    <div className="criteria-section">
                                                        <h3 className="section-title">Personal Profile Filters</h3>
                                                        <div className="divider"></div>
                                                        <div className="filters-grid">
                                                            <div className="form-field">
                                                                <label className="field-label">Gender</label>
                                                                <MultiSelectDropdown
                                                                    options={genderOptions}
                                                                    selected={criteria.personalProfileFilters.gender}
                                                                    onChange={(val) => handleNestedUpdate(criteria.id, 'personalProfileFilters', 'gender', val)}
                                                                    label="Gender"
                                                                />
                                                            </div>
                                                            <div className="form-field">
                                                                <label className="field-label">Student Type</label>
                                                                <MultiSelectDropdown
                                                                    options={studentTypeOptions}
                                                                    selected={criteria.personalProfileFilters.studentType}
                                                                    onChange={(val) => handleNestedUpdate(criteria.id, 'personalProfileFilters', 'studentType', val)}
                                                                    label="Student Type"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Additional Filters */}
                                                    {[
                                                        { id: 'placementFilters', title: 'Placement Filters' },
                                                        { id: 'academicInternshipFilters', title: 'Academic Internship Filters' },
                                                        { id: 'customFieldFilters', title: 'Custom Field Filters' }
                                                    ].map((filter) => (
                                                        <div className="criteria-section" key={filter.id}>
                                                            <div className="section-header-row">
                                                                <h3 className="section-title">{filter.title}</h3>
                                                                {criteria[filter.id] && criteria[filter.id].length > 0 && (
                                                                    <button className="clear-btn-small" onClick={() => handleCriteriaUpdate(criteria.id, filter.id, [])}>
                                                                        Clear
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="divider"></div>

                                                            {/* Display added filters */}
                                                            {criteria[filter.id] && criteria[filter.id].length > 0 && (
                                                                <div className="added-filters-list">
                                                                    {criteria[filter.id].map(f => (
                                                                        <div key={f.id} className="filter-item">
                                                                            <span>{f.name}</span>
                                                                            <i className="fas fa-times remove-filter"></i>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <button
                                                                className="add-filter-btn-new"
                                                                onClick={() => handleAddFilter(criteria.id, filter.id)}
                                                            >
                                                                <div className="plus-icon-box"><i className="fas fa-plus"></i></div>
                                                                Add Filter
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <div className="bottom-actions-container">
                <button className="view-eligible-btn">
                    <i className="far fa-user"></i>
                    View Eligible Students
                </button>
            </div>
        </div>
    );
};

export default EligibilityTab;
