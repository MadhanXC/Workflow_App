import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, X, Check, ArrowLeft, Trash2, Building2, Briefcase, Flag, Calendar, Package, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskImage, Task, WorkItemType, PriorityType, SourceType, MaterialStatus, WorkConfirmationStatus } from "@/types/task";
import { ImagePreview } from "../products/ImagePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format, isAfter, endOfDay, isBefore } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  editingTask: Task | null;
}

const SOURCE_OPTIONS = ['call', 'text', 'email', 'in-person'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
const MATERIAL_STATUS_OPTIONS: MaterialStatus[] = ['ordered', 'yet-to-be-shipped', 'in-transit', 'received'];
const WORK_CONFIRMATION_OPTIONS: WorkConfirmationStatus[] = ['awaiting', 'confirmed'];

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const statusColors = {
  "not-initiated": "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  "completed": "bg-green-100 text-green-800"
};

export function TaskDialog({ isOpen, onOpenChange, onSave, editingTask }: TaskDialogProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  
  const [showPreview, setShowPreview] = useState(false);
  const [taskImages, setTaskImages] = useState<TaskImage[]>([]);
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [type, setType] = useState<WorkItemType>('job');
  const [source, setSource] = useState<SourceType>('call');
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [dateInitiated, setDateInitiated] = useState<Date | null>(null);
  const [dateCompleted, setDateCompleted] = useState<Date | null>(null);
  const [requiresMaterial, setRequiresMaterial] = useState(false);
  const [materialStatus, setMaterialStatus] = useState<MaterialStatus>(null);
  const [materialDescription, setMaterialDescription] = useState("");
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [workConfirmationStatus, setWorkConfirmationStatus] = useState<WorkConfirmationStatus>('awaiting');
  const [poNumber, setPoNumber] = useState("");

  const status = useMemo(() => {
    if (dateCompleted) return 'completed';
    if (dateInitiated) return 'in-progress';
    return 'not-initiated';
  }, [dateInitiated, dateCompleted]);

  const today = endOfDay(new Date());

  const isCompleted = editingTask?.status === 'completed';
  const isEditing = !!editingTask;
  const isDisabled = isCompleted && !isAdmin;
  const isBasicFieldsDisabled = (isEditing && !isAdmin) || isDisabled;

  const titleLabel = type === 'project' ? 'Project Title' : 'Job Title';
  const descriptionLabel = type === 'project' ? 'Project Description' : 'Job Description';

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setSite(editingTask.site || '');
      setDescription(editingTask.description);
      setNotes(editingTask.notes || '');
      setExistingImages(editingTask.images);
      setType(editingTask.type || 'job');
      setSource(editingTask.source || 'call');
      setPriority(editingTask.priority || 'medium');
      setDateInitiated(editingTask.dateInitiated || null);
      setDateCompleted(editingTask.dateCompleted || null);
      setRequiresMaterial(editingTask.requiresMaterial || false);
      setMaterialStatus(editingTask.materialStatus || null);
      setMaterialDescription(editingTask.materialDescription || '');
      setQuotedPrice(editingTask.quotedPrice || null);
      setConfirmedPrice(editingTask.confirmedPrice || null);
      setWorkConfirmationStatus(editingTask.workConfirmationStatus || 'awaiting');
      setPoNumber(editingTask.poNumber || '');

      if (isDisabled) {
        toast({
          title: "Notice",
          description: "This task is completed and cannot be modified",
        });
      }
    } else {
      resetForm();
    }
  }, [editingTask, isAdmin, toast, isEditing, isDisabled]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleDateCompletedChange = (date: Date | null) => {
    if (date && isAfter(date, today)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Cannot select a future date",
      });
      return;
    }

    if (date && dateInitiated && isBefore(date, dateInitiated)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Completion date cannot be earlier than initiation date",
      });
      return;
    }
    setDateCompleted(date);
  };

  const handleDateInitiatedChange = (date: Date | null) => {
    if (date && isAfter(date, today)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Cannot select a future date",
      });
      return;
    }

    setDateInitiated(date);
    if (date && dateCompleted && isBefore(dateCompleted, date)) {
      setDateCompleted(null);
      toast({
        title: "Notice",
        description: "Completion date was cleared as it was earlier than the new initiation date",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      const totalFiles = taskImages.length + existingImages.length;
      const remainingSlots = 50 - totalFiles;
      
      if (files.length > remainingSlots) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `You can only add ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'}`,
        });
        return;
      }

      const newFiles = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setTaskImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setTaskImages(prev => {
        const newFiles = [...prev];
        URL.revokeObjectURL(newFiles[index].preview);
        newFiles.splice(index, 1);
        return newFiles;
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Please provide a ${type === 'project' ? 'project' : 'job'} title`,
      });
      return;
    }

    if (!site.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a site address",
      });
      return;
    }

    if (dateCompleted && dateInitiated && isBefore(dateCompleted, dateInitiated)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Completion date cannot be earlier than initiation date",
      });
      return;
    }

    if (requiresMaterial && !materialStatus) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a material status",
      });
      return;
    }

    setIsUploading(true);
    try {
      await onSave({
        title,
        site,
        description,
        notes,
        status,
        images: taskImages.map(img => img.file),
        existingImages,
        type,
        source,
        priority,
        dateInitiated,
        dateCompleted,
        requiresMaterial,
        materialStatus: requiresMaterial ? materialStatus : null,
        materialDescription: requiresMaterial ? materialDescription : '',
        quotedPrice,
        confirmedPrice,
        workConfirmationStatus,
        poNumber: poNumber.trim() || undefined
      });
      
      cleanup();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: editingTask ? "Failed to update task" : "Failed to add task",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cleanup = () => {
    taskImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
  };

  const resetForm = () => {
    cleanup();
    setTaskImages([]);
    setTitle("");
    setSite("");
    setDescription("");
    setNotes("");
    setShowPreview(false);
    setExistingImages([]);
    setType('job');
    setSource('call');
    setPriority('medium');
    setDateInitiated(null);
    setDateCompleted(null);
    setRequiresMaterial(false);
    setMaterialStatus(null);
    setMaterialDescription("");
    setQuotedPrice(null);
    setConfirmedPrice(null);
    setWorkConfirmationStatus('awaiting');
    setPoNumber("");
  };

  const renderForm = () => {
    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-6 pr-4">
          {isDisabled && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-yellow-700">
                This {type} is completed and cannot be modified
              </p>
            </div>
          )}

          {isEditing && !isAdmin && !isDisabled && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-blue-700">
                You can only modify POCs to this {type}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {type === 'project' ? (
                <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-sm">
                  <Building2 className="h-3.5 w-3.5 mr-1" />
                  Project
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-sm">
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  Job
                </Badge>
              )}
              {!isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setType(type === 'project' ? 'job' : 'project')}
                  className="text-xs"
                >
                  Switch to {type === 'project' ? 'Job' : 'Project'}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select
                value={source}
                onValueChange={(value: SourceType) => setSource(value)}
                disabled={isBasicFieldsDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <RadioGroup 
                value={priority} 
                onValueChange={(value: PriorityType) => setPriority(value)}
                className="flex space-x-2"
                disabled={isBasicFieldsDisabled}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <div key={p} className="flex items-center space-x-1">
                    <RadioGroupItem value={p} id={`priority-${p}`} />
                    <Label htmlFor={`priority-${p}`} className="capitalize">
                      <Badge className={priorityColors[p]}>
                        {p}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{titleLabel}</label>
              <Input
                placeholder={`Enter ${type} title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Site Address</label>
              <Input
                placeholder="Enter site address"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{descriptionLabel}</label>
              <Textarea
                placeholder={`Enter ${type} description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-y"
                disabled={isBasicFieldsDisabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">POCs</label>
              <Textarea
                placeholder="Add points of contact and their details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] resize-y"
                disabled={isDisabled}
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quoted Price (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter quoted price"
                    value={quotedPrice || ''}
                    onChange={(e) => setQuotedPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isBasicFieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmed Price (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter confirmed price"
                    value={confirmedPrice || ''}
                    onChange={(e) => setConfirmedPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isBasicFieldsDisabled}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Badge className={statusColors[status]}>
                  {status.replace(/-/g, ' ')}
                </Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Work Confirmation Status</label>
                <Select
                  value={workConfirmationStatus}
                  onValueChange={(value: WorkConfirmationStatus) => setWorkConfirmationStatus(value)}
                  disabled={isBasicFieldsDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select confirmation status" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_CONFIRMATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="capitalize">
                        {option === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {workConfirmationStatus === 'confirmed' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PO Number</label>
                  <Input
                    placeholder="Enter PO number"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    disabled={isBasicFieldsDisabled}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Initiated</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!dateInitiated && "text-muted-foreground"}`}
                          disabled={isDisabled}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateInitiated ? format(dateInitiated, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateInitiated}
                          onSelect={handleDateInitiatedChange}
                          initialFocus
                          disabled={(date) => isAfter(date, today)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Completed</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!dateCompleted && "text-muted-foreground"}`}
                          disabled={isDisabled}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateCompleted ? format(dateCompleted, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateCompleted}
                          onSelect={handleDateCompletedChange}
                          initialFocus
                          disabled={(date) => 
                            isAfter(date, today) || 
                            (dateInitiated ? isBefore(date, dateInitiated) : false)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Material Required</Label>
                <Switch
                  checked={requiresMaterial}
                  onCheckedChange={setRequiresMaterial}
                  disabled={isBasicFieldsDisabled}
                />
              </div>

              {requiresMaterial && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Material Status</Label>
                    <Select
                      value={materialStatus || ''}
                      onValueChange={(value: MaterialStatus) => setMaterialStatus(value)}
                      disabled={isBasicFieldsDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            <div className="flex items-center">
                              <Package className="mr-2 h-4 w-4" />
                              {option.replace(/-/g, ' ')}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Material Description</Label>
                    <Textarea
                      placeholder="Enter material details..."
                      value={materialDescription}
                      onChange={(e) => setMaterialDescription(e.target.value)}
                      className="min-h-[100px] resize-y"
                      disabled={isBasicFieldsDisabled}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Documents</h3>
                <span className="text-sm text-muted-foreground">
                  {taskImages.length + existingImages.length} / 50 files
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Upload up to 50 documents of any type
                  </span>
                </div>

                <Input
                  type="file"
                  accept="*/*"
                  onChange={handleFileChange}
                  multiple
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  disabled={isDisabled}
                />

                <ImagePreview
                  existingImages={existingImages}
                  newImages={taskImages}
                  onRemove={removeFile}
                  disabled={isDisabled}
                  maxImages={50}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderPreview = () => (
    <ScrollArea className="h-[calc(100vh-16rem)]">
      <div className="space-y-6 pr-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <button onClick={() => setShowPreview(false)} className="hover:underline">
            Back to editing
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{type === 'project' ? 'Project' : 'Job'} Details</h3>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {type === 'project' ? (
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <Building2 className="h-3.5 w-3.5 mr-1" />
                    Project
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <Briefcase className="h-3.5 w-3.5 mr-1" />
                    Job
                  </Badge>
                )}
                <Badge className={priorityColors[priority]}>
                  {priority}
                </Badge>
              </div>
              <p><strong>Source:</strong> {source}</p>
              <p><strong>{titleLabel}:</strong> {title}</p>
              <p><strong>Site Address:</strong> {site}</p>
              <p><strong>{descriptionLabel}:</strong> {description || 'None'}</p>
              <p><strong>POCs:</strong> {notes || 'None'}</p>
              <Badge className={statusColors[status]}>
                Status: {status.replace(/-/g, ' ')}
              </Badge>
              <Badge variant="secondary">
                Work Confirmation: {workConfirmationStatus === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
              </Badge>
              {workConfirmationStatus === 'confirmed' && (
                <>
                  {poNumber && (
                    <p><strong>PO Number:</strong> {poNumber}</p>
                  )}
                  {dateInitiated && (
                    <p><strong>Date Initiated:</strong> {format(dateInitiated, "PPP")}</p>
                  )}
                  {dateCompleted && (
                    <p><strong>Date Completed:</strong> {format(dateCompleted, "PPP")}</p>
                  )}
                  {quotedPrice !== null && (
                    <p><strong>Quoted Price:</strong> ${quotedPrice.toFixed(2)}</p>
                  )}
                  {confirmedPrice !== null && (
                    <p><strong>Confirmed Price:</strong> ${confirmedPrice.toFixed(2)}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {requiresMaterial && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Material Information</h3>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                <p><strong>Material Status:</strong> {materialStatus?.replace(/-/g, ' ')}</p>
                <p><strong>Material Description:</strong> {materialDescription || 'None'}</p>
              </div>
            </div>
          )}

          {(existingImages.length > 0 || taskImages.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents</h3>
              <ImagePreview
                existingImages={existingImages}
                newImages={taskImages}
                readonly
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 pt-4 bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={isUploading}
            >
              {isUploading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingTask ? 'Update' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[600px] h-[calc(100vh-4rem)] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingTask 
              ? `Edit ${type === 'project' ? 'Project' : 'Job'}`
              : `Add New ${type === 'project' ? 'Project' : 'Job'}`
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="h-full">
              {renderForm()}
              
              <div className="sticky bottom-0 pt-4 bg-background">
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!title.trim()}
                  className="w-full"
                >
                  Review & {editingTask ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            renderPreview()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}