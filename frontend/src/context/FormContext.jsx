import React, { createContext, useContext, useReducer } from 'react';

const FormContext = createContext();

const initialState = {
  companyInformation: {
    companyName: '',
    industry: '',
    location: '',
    driveCategory: 'Core',
    placementCategory: 'Dream'
  },
  driveInformation: {
    driveName: '',
    driveType: [],
    driveDescription: '',
    agreement: '0',
    driveAttachments: null,
    driveSpoc: '',
    driveDate: '',
    numberOfRounds: 'Not Applicable',
    optionalInformation: ''
  },
  profileSalaryInformation: {
    profile: '',
    jobTitle: '',
    hasSalary: false,
    annualSalary: '',
    monthlySalary: '',
    hasStipend: false,
    annualStipend: '',
    monthlyStipend: '',
    toBeAnnounced: false,
    showDegreeBasedSalary: false,
    degreeBasedSalary: [],
    salaryDetails: {
      btech: {
        enabled: false,
        salary: '',
        stipend: ''
      },
      mtech: {
        enabled: false,
        salary: '',
        stipend: ''
      },
      mba: {
        enabled: false,
        salary: '',
        stipend: ''
      },
      phd: {
        enabled: false,
        salary: '',
        stipend: ''
      },
      custom: {
        enabled: false,
        degreeName: '',
        salary: '',
        stipend: ''
      }
    }
  },
  eligibility: {
    criteriaList: [
      {
        id: 'criteria-1',
        title: 'Criteria 1',
        chooseFromTemplate: 'Templates',
        passOutYear: '2026',
        programmesOffered: 6,
        requiredSkills: '',
        lastDateTimeToApply: '',
        additionalInformation: '',
        documentsRequired: '',
        educationalDetails: {
          filterType: 'Individual',
          educationList: ['10th', '12th', 'UG', 'PG', 'Diploma'],
          tenthPercentage: '60',
          tenthCgpa: '6',
          twelfthPercentage: '60',
          twelfthCgpa: '6',
          ugPercentage: '60',
          ugCgpa: '6'
        },
        backlogDetails: {
          allowCurrentBacklogsUpto: 0,
          allowHistoryOfBacklogs: 'Yes'
        },
        personalProfileFilters: {
          gender: ['Male', 'Female'],
          studentType: ['Regular', 'Lateral']
        },
        placementFilters: [],
        academicInternshipFilters: [],
        customFieldFilters: []
      }
    ]
  },
  sections: [
    { id: 'company-information', title: 'Company Information' },
    { id: 'drive-information', title: 'Drive Information' },
    { id: 'profile-salary-information', title: 'Profile & Salary Information' }
  ],
  errors: {},
  isValid: false
};

const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          [action.field]: action.value
        }
      };
    case 'UPDATE_CHECKBOX_ARRAY':
      const currentArray = state[action.section][action.field] || [];
      const newArray = currentArray.includes(action.value)
        ? currentArray.filter(item => item !== action.value)
        : [...currentArray, action.value];
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          [action.field]: newArray
        }
      };
    case 'UPDATE_SALARY_DETAILS':
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          salaryDetails: {
            ...state[action.section].salaryDetails,
            [action.degree]: {
              ...state[action.section].salaryDetails[action.degree],
              [action.field]: action.value
            }
          }
        }
      };
    case 'REORDER_CRITERIA':
      const newCriteriaList = [...state.eligibility.criteriaList];
      const [removedCriteria] = newCriteriaList.splice(action.startIndex, 1);
      newCriteriaList.splice(action.endIndex, 0, removedCriteria);
      return {
        ...state,
        eligibility: {
          ...state.eligibility,
          criteriaList: newCriteriaList
        }
      };
    case 'REORDER_SECTIONS':
      const newSections = [...state.sections];
      const [removedSection] = newSections.splice(action.startIndex, 1);
      newSections.splice(action.endIndex, 0, removedSection);
      return {
        ...state,
        sections: newSections
      };
    case 'UPDATE_CRITERIA':
      const updatedList = state.eligibility.criteriaList.map(item =>
        item.id === action.id ? { ...item, ...action.updates } : item
      );
      return {
        ...state,
        eligibility: {
          ...state.eligibility,
          criteriaList: updatedList
        }
      };
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors
      };
    case 'SET_VALIDITY':
      return {
        ...state,
        isValid: action.isValid
      };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

export const FormProvider = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const updateField = (section, field, value) => {
    dispatch({
      type: 'UPDATE_FIELD',
      section,
      field,
      value
    });
  };

  const updateCheckboxArray = (section, field, value) => {
    dispatch({
      type: 'UPDATE_CHECKBOX_ARRAY',
      section,
      field,
      value
    });
  };

  const updateSalaryDetails = (section, degree, field, value) => {
    dispatch({
      type: 'UPDATE_SALARY_DETAILS',
      section,
      degree,
      field,
      value
    });
  };

  const reorderCriteria = (startIndex, endIndex) => {
    dispatch({
      type: 'REORDER_CRITERIA',
      startIndex,
      endIndex
    });
  };

  const reorderSections = (startIndex, endIndex) => {
    dispatch({
      type: 'REORDER_SECTIONS',
      startIndex,
      endIndex
    });
  };

  const updateCriteria = (id, updates) => {
    dispatch({
      type: 'UPDATE_CRITERIA',
      id,
      updates
    });
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Company Information validation
    if (!state.companyInformation.companyName.trim()) {
      errors.companyName = 'Company name is required';
      isValid = false;
    }
    if (!state.companyInformation.industry.trim()) {
      errors.industry = 'Website of company is required';
      isValid = false;
    }
    if (!state.companyInformation.location.trim()) {
      errors.location = 'Location of company is required';
      isValid = false;
    }
    if (!state.companyInformation.driveCategory.trim()) {
      errors.companyDriveCategory = 'Drive category is required';
      isValid = false;
    }
    if (!state.companyInformation.placementCategory.trim()) {
      errors.placementCategory = 'Placement category is required';
      isValid = false;
    }

    // Drive Information validation
    if (!state.driveInformation.driveName.trim()) {
      errors.driveName = 'Drive name is required';
      isValid = false;
    }
    if (!state.driveInformation.driveType || state.driveInformation.driveType.length === 0) {
      errors.driveType = 'At least one drive type must be selected';
      isValid = false;
    }
    if (!state.driveInformation.driveDate) {
      errors.driveDate = 'Drive date is required';
      isValid = false;
    }
    if (!state.driveInformation.numberOfRounds || state.driveInformation.numberOfRounds === '') {
      errors.numberOfRounds = 'Number of rounds must be selected';
      isValid = false;
    }

    // Profile & Salary Information validation
    // No required fields in this section currently

    // Eligibility validation
    if (state.eligibility.documentsRequired && !state.eligibility.documentsRequired.trim()) {
      errors.documentsRequired = 'Documents required list is recommended';
    }

    dispatch({ type: 'SET_ERRORS', errors });
    dispatch({ type: 'SET_VALIDITY', isValid });

    return isValid;
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  const value = {
    state,
    updateField,
    updateCheckboxArray,
    updateSalaryDetails,
    reorderCriteria,
    reorderSections,
    updateCriteria,
    validateForm,
    resetForm
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

export default FormContext;