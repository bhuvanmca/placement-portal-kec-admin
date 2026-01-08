'use client';

import { useForm, EligibilityCriteria } from '@/context/form-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Settings,
  X 
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import ProgrammeOfferedModal from './programme-offered-modal';

export default function EligibilityTab() {
  const { state, updateCriteria } = useForm();
  const [programmeModalOpen, setProgrammeModalOpen] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({
    'criteria-1': true
  });

  const toggleCriteria = (id: string) => {
    setExpandedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdate = (id: string, field: keyof EligibilityCriteria | string, value: any) => {
    // Handling nested updates for structured fields
    if (field.startsWith('educationalDetails.')) {
      const nestedField = field.split('.')[1];
      const current = state.eligibility.criteriaList.find(c => c.id === id)?.educationalDetails || {};
      updateCriteria(id, { 
        educationalDetails: { ...current, [nestedField]: value } 
      });
    } else if (field.startsWith('backlogDetails.')) {
        const nestedField = field.split('.')[1];
        const current = state.eligibility.criteriaList.find(c => c.id === id)?.backlogDetails || {};
        updateCriteria(id, { 
          backlogDetails: { ...current, [nestedField]: value } 
        });
    } else if (field.startsWith('personalProfileFilters.')) {
        const nestedField = field.split('.')[1];
        const current = state.eligibility.criteriaList.find(c => c.id === id)?.personalProfileFilters || {};
        updateCriteria(id, { 
            personalProfileFilters: { ...current, [nestedField]: value } 
        });
    }
    else {
      updateCriteria(id, { [field]: value });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {state.eligibility.criteriaList.map((criteria, index) => (
        <div key={criteria.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-gray-700">{criteria.title}</h3>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                <Eye size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500">
                <Trash2 size={18} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400"
                onClick={() => toggleCriteria(criteria.id)}
              >
                {expandedCriteria[criteria.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </Button>
            </div>
          </div>

          {expandedCriteria[criteria.id] && (
            <div className="p-6 space-y-8">
              
              {/* Template Selection */}
              <div className="flex items-end justify-between">
                <div className="w-1/3">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Choose from Template</Label>
                  <Select 
                    value={criteria.chooseFromTemplate}
                    onValueChange={(val) => handleUpdate(criteria.id, 'chooseFromTemplate', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Templates">Templates</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">Clear Selection</Button>
                   <Button className="bg-[#002147] text-white hover:bg-[#003366]">Save Template</Button>
                </div>
              </div>

              {/* Student Details */}
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-[#002147]">Student Details</h4>
                 <div className="w-1/3">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Pass Out Year<span className="text-red-500">*</span></Label>
                    <Select 
                        value={criteria.passOutYear}
                        onValueChange={(val) => handleUpdate(criteria.id, 'passOutYear', val)}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 
                  <Button 
                    variant="outline" 
                    className="text-[#002147] border-[#002147] hover:bg-[#002147] hover:text-white transition-colors flex items-center gap-2"
                    onClick={() => setProgrammeModalOpen(true)}
                 >
                    <Settings size={16} />
                    Configure Programmes Offered
                    <span className="flex items-center justify-center bg-[#002147] text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 ml-1 group-hover:bg-white group-hover:text-[#002147]">
                        {criteria.programmesOffered}
                    </span>
                 </Button>

                 <ProgrammeOfferedModal 
                    isOpen={programmeModalOpen}
                    onClose={() => setProgrammeModalOpen(false)}
                    onConfirm={(selectedIds) => {
                        handleUpdate(criteria.id, 'programmesOffered', selectedIds.length);
                        setProgrammeModalOpen(false);
                        // In a real app, you'd store the actual IDs in context too
                    }}
                    initialSelected={[]} // Would come from context in real app
                 />
              </div>

              {/* Educational Details */}
              <div className="space-y-4 pt-4 border-t border-dashed">
                 <h4 className="text-sm font-bold text-[#002147]">Educational Details</h4>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                       <Label className="text-xs text-gray-500">Filter Type</Label>
                       <Select 
                           value={criteria.educationalDetails?.filterType || 'Individual'}
                           onValueChange={(val) => handleUpdate(criteria.id, 'educationalDetails.filterType', val)}
                       >
                           <SelectTrigger>
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="Individual">Individual</SelectItem>
                               <SelectItem value="Combined">Combined</SelectItem>
                           </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-xs text-gray-500">Select Education<span className="text-red-500">*</span></Label>
                       <Select 
                           value="5 items selected" 
                           disabled
                       >
                           <SelectTrigger>
                               <SelectValue>5 items selected</SelectValue>
                           </SelectTrigger>
                       </Select>
                    </div>
                 </div>
                 
                 {/* 10th & 12th Marks */}
                 <div className="space-y-4 mt-4">
                     {/* 10th */}
                     <div className="space-y-2">
                         <Label className="text-sm font-medium">10th</Label>
                         <div className="flex gap-4 items-center">
                             <div className="flex items-center border rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500 w-48">
                                 Greater than or equal to
                             </div>
                             <div className="relative w-32">
                                 <Input 
                                    value={criteria.educationalDetails?.tenthPercentage}
                                    onChange={(e) => handleUpdate(criteria.id, 'educationalDetails.tenthPercentage', e.target.value)}
                                    className="pr-8"
                                 />
                                 <span className="absolute right-3 top-2.5 text-gray-400 text-xs">%</span>
                             </div>
                         </div>
                     </div>

                     {/* 12th */}
                     <div className="space-y-2">
                         <Label className="text-sm font-medium">12th</Label>
                         <div className="flex gap-4 items-center">
                             <div className="flex items-center border rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500 w-48">
                                 Greater than or equal to
                             </div>
                             <div className="relative w-32">
                                 <Input 
                                    value={criteria.educationalDetails?.twelfthCgpa}
                                    onChange={(e) => handleUpdate(criteria.id, 'educationalDetails.twelfthCgpa', e.target.value)}
                                    className="pr-12"
                                 />
                                 <span className="absolute right-3 top-2.5 text-gray-400 text-xs">CGPA</span>
                             </div>
                         </div>
                     </div>
                 </div>
              </div>

               {/* Backlogs */}
               <div className="space-y-4 pt-4 border-t border-dashed">
                 <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Allow Current Backlogs upto</Label>
                        <Input 
                             type="number"
                             value={criteria.backlogDetails?.allowCurrentBacklogsUpto}
                             onChange={(e) => handleUpdate(criteria.id, 'backlogDetails.allowCurrentBacklogsUpto', e.target.value)}
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Allow Students with History of Backlogs</Label>
                        <Select 
                             value={criteria.backlogDetails?.allowHistoryOfBacklogs}
                             onValueChange={(val) => handleUpdate(criteria.id, 'backlogDetails.allowHistoryOfBacklogs', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                 </div>
               </div>

               {/* Personal Profile Filters */}
               <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-sm font-bold text-[#002147]">Personal Profile Filters</h4>
                  <div className="space-y-4">
                      <div className="space-y-1.5 w-1/2">
                          <Label className="text-xs text-gray-500">Gender</Label>
                          <Select 
                              value="Male, Female" 
                              disabled // Just mocking visuals for now as multiselect needs a custom component
                          >
                              <SelectTrigger>
                                  <SelectValue>Male, Female</SelectValue>
                              </SelectTrigger>
                          </Select>
                      </div>
                      <div className="space-y-1.5 w-1/2">
                          <Label className="text-xs text-gray-500">Student Type</Label>
                          <Select 
                              value="Regular, Lateral" 
                              disabled
                          >
                              <SelectTrigger>
                                  <SelectValue>Regular, Lateral</SelectValue>
                              </SelectTrigger>
                          </Select>
                      </div>
                  </div>
               </div>

                {/* Other Filters (Placement, Internship, Custom) */}
                <div className="space-y-6 pt-4">
                    <div>
                        <h4 className="text-sm font-bold text-[#002147] mb-2">Placement Filters</h4>
                        <Button variant="outline" size="sm" className="text-gray-600 gap-2">
                            <Plus size={14} /> Add Filter
                        </Button>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[#002147] mb-2">Academic Internship Filters</h4>
                        <Button variant="outline" size="sm" className="text-gray-600 gap-2">
                            <Plus size={14} /> Add Filter
                        </Button>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-[#002147] mb-2">Custom Field Filters</h4>
                        <Button variant="outline" size="sm" className="text-gray-600 gap-2">
                            <Plus size={14} /> Add Filter
                        </Button>
                    </div>
                </div>

            </div>
          )}
        </div>
      ))}
      <div className="flex justify-end">
         <Button variant="outline" className="gap-2">
            <Plus size={16} /> Add Criteria
         </Button>
      </div>
    </div>
  );
}
