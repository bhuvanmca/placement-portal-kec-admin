import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  itemCount?: number;
  confirmationKeyword?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemCount,
  confirmationKeyword = 'DELETE',
}: DeleteConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (inputValue !== confirmationKeyword) return;
    setLoading(true);
    try {
      await onConfirm();
      onClose();
      setInputValue(''); // Reset on success
    } catch (error) {
      console.error("Delete failed", error);
      // Ideally, error handling should be in the parent, but we ensure loading stops
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = inputValue === confirmationKeyword;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {itemCount && itemCount > 0 && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium flex items-center gap-2">
               <Trash2 className="h-4 w-4" />
               You are about to delete {itemCount} items.
             </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              To confirm, type <span className="font-bold select-all">{confirmationKeyword}</span> below:
            </label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type "${confirmationKeyword}"`}
              className="border-red-300 focus-visible:ring-red-500"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isConfirmed || loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {loading ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
