'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface CompanyInfo {
  companyName: string;
  industry: string;
  location: string;
  driveCategory: string;
  placementCategory: string;
}

export interface DriveInfo {
  driveName: string;
  driveType: string[];
  driveDescription: string;
  agreement: string;
  driveAttachments: FileList | null;
  driveSpoc: string;
  driveDate: string;
  numberOfRounds: string;
  optionalInformation: string;
}

export interface SalaryDetails {
  enabled: boolean;
  salary: string;
  stipend: string;
  degreeName?: string;
}

export interface ProfileSalaryInfo {
  profile: string;
  jobTitle: string;
  hasSalary: boolean;
  annualSalary: string;
  monthlySalary: string;
  hasStipend: boolean;
  annualStipend: string;
  monthlyStipend: string;
  toBeAnnounced: boolean;
  showDegreeBasedSalary: boolean;
  degreeBasedSalary: any[]; // Deprecated in favor of salaryDetails?
  salaryDetails: {
    btech: SalaryDetails;
    mtech: SalaryDetails;
    mba: SalaryDetails;
    phd: SalaryDetails;
    custom: SalaryDetails;
    [key: string]: SalaryDetails;
  };
}

export interface EligibilityCriteria {
  id: string;
  title: string;
  chooseFromTemplate: string;
  passOutYear: string;
  programmesOffered: number;
  requiredSkills: string;
  lastDateTimeToApply: string;
  additionalInformation: string;
  documentsRequired: string;
  educationalDetails: any;
  backlogDetails: any;
  personalProfileFilters: any;
  placementFilters: any[];
  academicInternshipFilters: any[];
  customFieldFilters: any[];
}

export interface FormState {
  companyInformation: CompanyInfo;
  driveInformation: DriveInfo;
  profileSalaryInformation: ProfileSalaryInfo;
  eligibility: {
    criteriaList: EligibilityCriteria[];
  };
  sections: { id: string; title: string }[];
  errors: Record<string, string>;
  isValid: boolean;
}

const initialState: FormState = {
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
      btech: { enabled: false, salary: '', stipend: '' },
      mtech: { enabled: false, salary: '', stipend: '' },
      mba: { enabled: false, salary: '', stipend: '' },
      phd: { enabled: false, salary: '', stipend: '' },
      custom: { enabled: false, degreeName: '', salary: '', stipend: '' }
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

// Reducer
type Action =
  | { type: 'UPDATE_FIELD'; section: keyof FormState; field: string; value: any }
  | { type: 'UPDATE_CHECKBOX_ARRAY'; section: keyof FormState; field: string; value: string }
  | { type: 'UPDATE_SALARY_DETAILS'; section: keyof FormState; degree: string; field: string; value: any }
  | { type: 'REORDER_CRITERIA'; startIndex: number; endIndex: number }
  | { type: 'REORDER_SECTIONS'; startIndex: number; endIndex: number }
  | { type: 'UPDATE_CRITERIA'; id: string; updates: Partial<EligibilityCriteria> }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SET_VALIDITY'; isValid: boolean }
  | { type: 'RESET_FORM' };

const formReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.section]: {
          ...(state[action.section] as any),
          [action.field]: action.value
        }
      };
    case 'UPDATE_CHECKBOX_ARRAY': {
       // @ts-ignore
      const currentArray = state[action.section][action.field] || [];
      const newArray = currentArray.includes(action.value)
        ? currentArray.filter((item: string) => item !== action.value)
        : [...currentArray, action.value];
      return {
        ...state,
        [action.section]: {
          ...(state[action.section] as any),
          [action.field]: newArray
        }
      };
    }
    case 'UPDATE_SALARY_DETAILS':
      // @ts-ignore
      return {
        ...state,
        [action.section]: {
          ...(state[action.section] as any),
          salaryDetails: {
            // @ts-ignore
            ...state[action.section].salaryDetails,
            [action.degree]: {
               // @ts-ignore
              ...state[action.section].salaryDetails[action.degree],
              [action.field]: action.value
            }
          }
        }
      };
    case 'REORDER_CRITERIA': {
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
    }
    case 'REORDER_SECTIONS': {
      const newSections = [...state.sections];
      const [removedSection] = newSections.splice(action.startIndex, 1);
      newSections.splice(action.endIndex, 0, removedSection);
      return {
        ...state,
        sections: newSections
      };
    }
    case 'UPDATE_CRITERIA': {
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
    }
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

const FormContext = createContext<{
  state: FormState;
  updateField: (section: keyof FormState, field: string, value: any) => void;
  updateCheckboxArray: (section: keyof FormState, field: string, value: string) => void;
  updateSalaryDetails: (section: keyof FormState, degree: string, field: string, value: any) => void;
  reorderCriteria: (startIndex: number, endIndex: number) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;
  updateCriteria: (id: string, updates: Partial<EligibilityCriteria>) => void;
  validateForm: () => boolean;
  resetForm: () => void;
} | undefined>(undefined);

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const updateField = (section: keyof FormState, field: string, value: any) => {
    dispatch({ type: 'UPDATE_FIELD', section, field, value });
  };

  const updateCheckboxArray = (section: keyof FormState, field: string, value: string) => {
    dispatch({ type: 'UPDATE_CHECKBOX_ARRAY', section, field, value });
  };

  const updateSalaryDetails = (section: keyof FormState, degree: string, field: string, value: any) => {
    dispatch({ type: 'UPDATE_SALARY_DETAILS', section, degree, field, value });
  };

  const reorderCriteria = (startIndex: number, endIndex: number) => {
    dispatch({ type: 'REORDER_CRITERIA', startIndex, endIndex });
  };

  const reorderSections = (startIndex: number, endIndex: number) => {
    dispatch({ type: 'REORDER_SECTIONS', startIndex, endIndex });
  };

  const updateCriteria = (id: string, updates: Partial<EligibilityCriteria>) => {
    dispatch({ type: 'UPDATE_CRITERIA', id, updates });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Company Information validation
    if (!state.companyInformation.companyName.trim()) {
      errors.companyName = 'Company name is required';
      isValid = false;
    }
    // ... Add other validations as needed
    // Simplified for now based on original file

    dispatch({ type: 'SET_ERRORS', errors });
    dispatch({ type: 'SET_VALIDITY', isValid });

    return isValid;
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  return (
    <FormContext.Provider value={{
      state,
      updateField,
      updateCheckboxArray,
      updateSalaryDetails,
      reorderCriteria,
      reorderSections,
      updateCriteria,
      validateForm,
      resetForm
    }}>
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
