'use client';
import { useState, useEffect } from 'react';
import { useForm, FormState } from '@/context/form-context';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import EligibilityTab from './eligibility-tab';
import InterviewProcessTab from './interview-process-tab';

// Placeholders for other tabs
// const EligibilityTab = () => <div>Eligibility Tab Content (Coming Soon)</div>; // Removed placeholder
// const InterviewProcessTab = () => <div>Interview Process Tab Content (Coming Soon)</div>; // Removed placeholder
const OfferLetterTab = () => <div>Offer Repository Tab Content (Coming Soon)</div>;

export default function MainContent() {
  const { state, updateField, reorderSections } = useForm();
  const [activeTab, setActiveTab] = useState('Drive Details');
  const [activeSection, setActiveSection] = useState('company-information');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'company-information': true,
    'drive-information': false,
    'profile-salary-information': false
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderSections(result.source.index, result.destination.index);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    setActiveSection(sectionId);
  };

  const handleInputChange = (section: keyof FormState, field: string, value: any) => {
    updateField(section, field, value);
  };

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'company-information':
        return (
          <div className="space-y-4 p-4 border rounded-md bg-white">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input 
                id="companyName" 
                value={state.companyInformation.companyName}
                onChange={(e) => handleInputChange('companyInformation', 'companyName', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Website</Label>
              <Input 
                id="industry" 
                value={state.companyInformation.industry}
                onChange={(e) => handleInputChange('companyInformation', 'industry', e.target.value)}
                placeholder="Enter company website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={state.companyInformation.location}
                onChange={(e) => handleInputChange('companyInformation', 'location', e.target.value)}
                placeholder="Enter company location"
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Drive Category</Label>
                  <Select 
                    value={state.companyInformation.driveCategory} 
                    onValueChange={(val) => handleInputChange('companyInformation', 'driveCategory', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Core">Core</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Non Tech">Non Tech</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Placement Category</Label>
                   <Select 
                    value={state.companyInformation.placementCategory} 
                    onValueChange={(val) => handleInputChange('companyInformation', 'placementCategory', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dream">Dream</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Super Dream">Super Dream</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
          </div>
        );
      case 'drive-information':
        return (
           <div className="space-y-4 p-4 border rounded-md bg-white">
             <div className="space-y-2">
              <Label>Drive Name</Label>
              <Input 
                value={state.driveInformation.driveName}
                onChange={(e) => handleInputChange('driveInformation', 'driveName', e.target.value)}
                placeholder="Enter drive name"
              />
             </div>
             {/* Add more fields similarly */}
             <div className="space-y-2">
               <Label>Description</Label>
               <Textarea 
                 value={state.driveInformation.driveDescription}
                 onChange={(e) => handleInputChange('driveInformation', 'driveDescription', e.target.value)}
                 placeholder="Drive Description"
               />
             </div>
           </div>
        );
      case 'profile-salary-information':
        return (
          <div className="space-y-4 p-4 border rounded-md bg-white">
            <div className="space-y-2">
              <Label>Profile / Designation</Label>
               <Input 
                value={state.profileSalaryInformation.profile}
                onChange={(e) => handleInputChange('profileSalaryInformation', 'profile', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasSalary"
                  checked={state.profileSalaryInformation.hasSalary}
                  onCheckedChange={(checked) => handleInputChange('profileSalaryInformation', 'hasSalary', checked)}
                />
                <Label htmlFor="hasSalary">Salary</Label>
             </div>
             {state.profileSalaryInformation.hasSalary && (
                <div className="space-y-2 pl-6">
                   <Label>Annual Salary</Label>
                   <Input 
                     value={state.profileSalaryInformation.annualSalary}
                     onChange={(e) => handleInputChange('profileSalaryInformation', 'annualSalary', e.target.value)}
                   />
                </div>
             )}
          </div>
        );
      default:
        return <div>Select a section</div>;
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center space-x-1 border-b pb-2 overflow-x-auto">
        {tabs.map(tab => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={cn(
               "px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
               activeTab === tab 
                 ? "bg-[#002147] text-white" 
                 : "text-gray-600 hover:bg-gray-100"
             )}
           >
             {tab}
           </button>
        ))}
         <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">Ongoing</span>
         <Button variant="outline" size="sm" className="ml-2 gap-2">
            Republish
         </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'Drive Details' && (
           <div className="flex h-full gap-6">
              {/* Left Sidebar - Section List */}
              <div className="w-1/3 border rounded-lg p-2 bg-gray-50 overflow-y-auto">
                 <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="sections-list">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                           {state.sections.map((section, index) => (
                              <Draggable key={section.id} draggableId={section.id} index={index}>
                                {(provided) => (
                                   <div
                                     ref={provided.innerRef}
                                     {...provided.draggableProps}
                                     className="bg-white border rounded-md shadow-sm overflow-hidden"
                                   >
                                      <div 
                                        className={cn(
                                          "flex items-center p-3 cursor-pointer hover:bg-gray-50",
                                          activeSection === section.id && "border-l-4 border-l-[#002147]"
                                        )}
                                        onClick={() => toggleSection(section.id)}
                                      >
                                         <div {...provided.dragHandleProps} className="mr-3 text-gray-400 cursor-grab">
                                            <GripVertical size={16} />
                                         </div>
                                         <span className="font-medium flex-1 text-sm">{section.title}</span>
                                         {expandedSections[section.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
              </div>

              {/* Right Content */}
              <div className="flex-1 overflow-y-auto pr-2">
                  <div className="bg-white border rounded-lg p-4 shadow-sm min-h-[500px]">
                     <div className="flex items-center mb-4 pb-2 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {state.sections.find(s => s.id === activeSection)?.title}
                        </h3>
                     </div>
                     {expandedSections[activeSection] && renderSectionContent(activeSection)}
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'Eligibility' && (
            <div className="h-full overflow-y-auto p-1">
                <EligibilityTab />
            </div>
        )}
        {activeTab === 'Interview Process' && (
            <div className="h-full overflow-y-auto p-1">
                 <InterviewProcessTab />
            </div>
        )}
        {activeTab === 'Offer Repository' && (
             <div className="h-full overflow-y-auto p-1">
                <OfferLetterTab />
            </div>
        )}
        {['Drive Summary', 'Email Template'].includes(activeTab) && (
           <div className="flex flex-col items-center justify-center h-full text-gray-400 border rounded-lg bg-gray-50">
             <p>This section ({activeTab}) is under development.</p>
           </div>
        )}
      </div>
    </div>
  );
}
