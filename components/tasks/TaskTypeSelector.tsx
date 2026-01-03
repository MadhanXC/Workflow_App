"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Building2, CheckCircle } from "lucide-react";
import { WorkItemType } from "@/types/task";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TaskTypeSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeSelect: (type: WorkItemType) => void;
}

export function TaskTypeSelector({ isOpen, onOpenChange, onTypeSelect }: TaskTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<WorkItemType | null>(null);

  const handleSelect = (type: WorkItemType) => {
    setSelectedType(type);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onTypeSelect(selectedType);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          setSelectedType(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-center text-2xl font-bold">Select Work Item Type</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-2">
          <p className="text-center text-muted-foreground mb-6">
            Choose the type of work item you want to create
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={cn(
                "relative cursor-pointer rounded-xl border-2 p-6 transition-all",
                selectedType === 'project' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => handleSelect('project')}
            >
              {selectedType === 'project' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Project</h3>
              </div>
            </div>
            
            <div 
              className={cn(
                "relative cursor-pointer rounded-xl border-2 p-6 transition-all",
                selectedType === 'job' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => handleSelect('job')}
            >
              {selectedType === 'job' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Job</h3>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedType}
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}