'use client';
import MainContent from '@/components/drive-form/main-content';

export default function CreateDrivePage() {
  return (
    <div className="h-full flex flex-col">
       <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Create / Edit Drive</h1>
          <p className="text-sm text-gray-500">Manage drive details, eligibility, and process.</p>
       </div>
       <div className="flex-1 min-h-0">
         <MainContent />
       </div>
    </div>
  );
}
