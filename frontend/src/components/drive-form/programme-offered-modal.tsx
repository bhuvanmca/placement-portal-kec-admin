'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock Data
const PROGRAMMES = [
  { id: '1', campus: 'KONGU', department: 'AI & DS', degreeType: 'UG', programme: 'B.Tech - Artificial Intelligence & Data Science' },
  { id: '2', campus: 'KONGU', department: 'AI & ML', degreeType: 'UG', programme: 'B.E - Artificial Intelligence & Machine Learning' },
  { id: '3', campus: 'KONGU', department: 'Automobile Engineering', degreeType: 'UG', programme: 'B.E - Automobile Engineering' },
  { id: '4', campus: 'KONGU', department: 'Chemical Engineering', degreeType: 'UG', programme: 'B.Tech - Chemical Engineering' },
  { id: '5', campus: 'KONGU', department: 'Civil Engineering', degreeType: 'UG', programme: 'B.E - Civil Engineering' },
  { id: '6', campus: 'KONGU', department: 'Computer Science', degreeType: 'UG', programme: 'B.E - Computer Science & Engineering' },
  { id: '7', campus: 'KONGU', department: 'EEE', degreeType: 'UG', programme: 'B.E - Electrical & Electronics Engineering' },
  { id: '8', campus: 'KONGU', department: 'ECE', degreeType: 'UG', programme: 'B.E - Electronics & Communication Engineering' },
  { id: '9', campus: 'KONGU', department: 'IT', degreeType: 'UG', programme: 'B.Tech - Information Technology' },
  { id: '10', campus: 'KONGU', department: 'MBA', degreeType: 'PG', programme: 'Master of Business Administration' },
];

interface ProgrammeOfferedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  initialSelected?: string[];
}

export default function ProgrammeOfferedModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialSelected = []
}: ProgrammeOfferedModalProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters state
  const [filters, setFilters] = useState({
    campus: 'all',
    department: 'all',
    degreeType: 'all',
    groups: 'all'
  });

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
        setSelected(prev => [...prev, id]);
    } else {
        setSelected(prev => prev.filter(item => item !== id));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        const newSelected = new Set(selected);
        filteredProgrammes.forEach(p => newSelected.add(p.id));
        setSelected(Array.from(newSelected));
    } else {
        const visibleIds = new Set(filteredProgrammes.map(p => p.id));
        setSelected(prev => prev.filter(id => !visibleIds.has(id)));
    }
  };

  const filteredProgrammes = PROGRAMMES.filter(program => {
      // Basic Text Search
      if (searchQuery && !program.programme.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
      }
      
      // Filters
      if (filters.campus !== 'all' && program.campus !== filters.campus) return false;
      if (filters.department !== 'all' && program.department !== filters.department) return false;
      if (filters.degreeType !== 'all' && program.degreeType !== filters.degreeType) return false;
      
      // Show Selected Only Toggle
      if (showSelectedOnly && !selected.includes(program.id)) return false;

      return true;
  });

  const clearAllFilters = () => {
      setFilters({
          campus: 'all',
          department: 'all',
          degreeType: 'all',
          groups: 'all'
      });
      setSearchQuery('');
      setShowSelectedOnly(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[900px] md:max-w-[1000px] lg:max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold text-gray-800">Programme Offered</DialogTitle>
          {/* <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button> */}
        </DialogHeader>

        {/* Filters Section */}
        <div className="p-4 border-b bg-gray-50 space-y-4">
             <div className="flex gap-4">
                <Select value={filters.campus} onValueChange={(v) => setFilters(prev => ({...prev, campus: v}))}>
                    <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Campus" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Campus</SelectItem>
                        <SelectItem value="KONGU">KONGU</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filters.department} onValueChange={(v) => setFilters(prev => ({...prev, department: v}))}>
                    <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Department</SelectItem>
                        <SelectItem value="AI & DS">AI & DS</SelectItem>
                        <SelectItem value="CSE">CSE</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filters.degreeType} onValueChange={(v) => setFilters(prev => ({...prev, degreeType: v}))}>
                    <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Degree Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Degree Type</SelectItem>
                        <SelectItem value="UG">UG</SelectItem>
                        <SelectItem value="PG">PG</SelectItem>
                    </SelectContent>
                </Select>
                
                 <Select value={filters.groups} onValueChange={(v) => setFilters(prev => ({...prev, groups: v}))}>
                    <SelectTrigger className="w-40 bg-white">
                        <SelectValue placeholder="Groups" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Groups</SelectItem>
                        <SelectItem value="Circuit">Circuit</SelectItem>
                        <SelectItem value="Non-Circuit">Non-Circuit</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-[#002147] border-[#002147] hover:bg-gray-50">
                        <X size={14} className="mr-1" /> Clear All
                    </Button>
                    <Button variant="default" size="sm" className="bg-[#002147] hover:bg-[#003366]">
                        <Filter size={14} className="mr-1" /> Apply Filter
                    </Button>
                </div>
             </div>

             <div className="flex items-center justify-between">
                <div className="relative w-1/3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Programmes Offered" 
                        className="pl-9 bg-white" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                         <span className="text-sm font-medium text-[#002147]">Total List : {PROGRAMMES.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-sm font-medium text-[#002147]">Selected : {selected.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox 
                            id="showSelected" 
                            checked={showSelectedOnly} 
                            onCheckedChange={(c) => setShowSelectedOnly(!!c)} 
                        />
                        <Label htmlFor="showSelected" className="text-sm cursor-pointer">Show Selected</Label>
                    </div>
                    {/* Removed unused 'Show Not Selected' filter */}
                </div>
             </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#002147] uppercase bg-[#E6F0FA] sticky top-0 z-10">
                    <tr>
                        <th className="p-4 w-10">
                           <Checkbox 
                                checked={filteredProgrammes.length > 0 && filteredProgrammes.every(p => selected.includes(p.id))}
                                onCheckedChange={(c) => toggleSelectAll(!!c)}
                           />
                        </th>
                        <th className="px-6 py-3 font-bold">Campus</th>
                        <th className="px-6 py-3 font-bold">Department</th>
                        <th className="px-6 py-3 font-bold">Degree Type</th>
                        <th className="px-6 py-3 font-bold">Programme Offered</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredProgrammes.length > 0 ? (
                        filteredProgrammes.map((prog) => (
                            <tr key={prog.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <Checkbox 
                                        checked={selected.includes(prog.id)}
                                        onCheckedChange={(c) => handleSelect(prog.id, !!c)}
                                    />
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{prog.campus}</td>
                                <td className="px-6 py-4 text-gray-500">{prog.department}</td>
                                <td className="px-6 py-4 text-gray-500">{prog.degreeType}</td>
                                <td className="px-6 py-4 text-gray-500">{prog.programme}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                No programmes found matching your filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        <DialogFooter className="p-4 border-t gap-2">
           <Button variant="outline" onClick={onClose}>Cancel</Button>
           <Button className="bg-[#002147] hover:bg-[#003366]" onClick={() => onConfirm(selected)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
