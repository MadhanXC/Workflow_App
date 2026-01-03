"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isAfter, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, FileSpreadsheet, File as FilePdf, DollarSign, Mail, Search } from "lucide-react";
import { Task } from "@/types/task";
import { ReportPeriod, generatePDFReport, generateExcelReport } from "@/lib/reports";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { EmailReportDialog } from "./EmailReportDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
}

export function ReportDialog({ isOpen, onOpenChange, tasks }: ReportDialogProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<ReportPeriod | 'custom' | 'selection'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeInProgress, setIncludeInProgress] = useState(true);
  const [includeNotStarted, setIncludeNotStarted] = useState(true);
  const [includeProjects, setIncludeProjects] = useState(true);
  const [includeJobs, setIncludeJobs] = useState(true);
  const [includePriceDetails, setIncludePriceDetails] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailDialogData, setEmailDialogData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const today = endOfDay(new Date());

  const handlePeriodChange = (value: ReportPeriod | 'custom' | 'selection') => {
    setPeriod(value);
    setSelectedDate(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTasks([]);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && isAfter(date, today)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Cannot select dates beyond today",
      });
      return;
    }

    setSelectedDate(date);
    if (date) {
      let start: Date;
      let end: Date;

      switch (period) {
        case 'weekly':
          start = startOfWeek(date);
          end = endOfWeek(date);
          break;
        case 'monthly':
          start = startOfMonth(date);
          end = endOfMonth(date);
          break;
        case 'quarterly':
          start = startOfQuarter(date);
          end = endOfQuarter(date);
          break;
        case 'yearly':
          start = startOfYear(date);
          end = endOfYear(date);
          break;
        default:
          return;
      }

      if (isAfter(end, today)) {
        end = today;
      }

      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date && isAfter(date, today)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Cannot select dates beyond today",
      });
      return;
    }

    setStartDate(date);
    if (date && endDate && isAfter(date, endDate)) {
      setEndDate(undefined);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date && isAfter(date, today)) {
      toast({
        variant: "destructive",
        title: "Invalid Date",
        description: "Cannot select dates beyond today",
      });
      return;
    }

    setEndDate(date);
  };

  const getDateRangeText = () => {
    if (period === 'daily') {
      return 'Current day';
    }
    if (!startDate || !endDate) {
      return 'Select date';
    }
    return `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`;
  };

  const handleGenerateReport = async (type: 'pdf' | 'excel' | 'email', includePrices: boolean) => {
    let filteredTasks = tasks;

    // If in selection mode, filter by selected tasks
    if (period === 'selection') {
      if (selectedTasks.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select at least one task",
        });
        return;
      }
      filteredTasks = tasks.filter(task => selectedTasks.includes(task.id));
    }

    const options = {
      period: period === 'custom' || period === 'selection' ? 'daily' : period,
      startDate: period === 'daily' ? undefined : startDate,
      endDate: period === 'daily' ? undefined : endDate,
      includeCompleted,
      includeInProgress,
      includeNotStarted,
      includeProjects,
      includeJobs,
      includePriceDetails: includePrices,
      selectedTasks: period === 'selection' ? selectedTasks : undefined
    };

    const priceText = includePrices ? '-with-prices' : '';
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const reportName = `work-tasks-report${priceText}-${period}-${dateStr}`;

    if (type === 'email') {
      const pdfDoc = generatePDFReport(filteredTasks, options);
      const pdfBuffer = pdfDoc.output('arraybuffer');
      
      const excelBuffer = generateExcelReport(filteredTasks, options);

      setEmailDialogData({
        pdfBuffer: Buffer.from(pdfBuffer),
        excelBuffer: Buffer.from(excelBuffer),
        reportName
      });
      setIsEmailDialogOpen(true);
      return;
    }

    if (type === 'pdf') {
      const doc = generatePDFReport(filteredTasks, options);
      doc.save(`${reportName}.pdf`);
    } else {
      const buffer = generateExcelReport(filteredTasks, options);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.site.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  });

  const isGenerateDisabled = () => {
    if (period === 'daily') return false;
    if (period === 'selection') return selectedTasks.length === 0;
    return !startDate || !endDate;
  };

  const renderTaskSelection = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
            >
              <Checkbox
                checked={selectedTasks.includes(task.id)}
                onCheckedChange={(checked) => {
                  setSelectedTasks(prev =>
                    checked
                      ? [...prev, task.id]
                      : prev.filter(id => id !== task.id)
                  );
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{task.title}</p>
                  <Badge variant="outline">{task.type}</Badge>
                  <Badge variant="secondary">{task.status.replace(/-/g, ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-1">{task.site}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Created: {format(task.createdAt, 'PP')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks([])}
            disabled={selectedTasks.length === 0}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks(filteredTasks.map(t => t.id))}
            disabled={filteredTasks.length === 0}
          >
            Select All
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Report Period */}
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Current Day)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  <SelectItem value="selection">Custom Data Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            {period !== 'daily' && period !== 'selection' && (
              <div className="space-y-4">
                {period !== 'custom' ? (
                  <div className="space-y-2">
                    <Label>Select {period.charAt(0).toUpperCase() + period.slice(1)}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => isAfter(date, today)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {startDate && endDate && (
                      <p className="text-sm text-muted-foreground">
                        Range: {format(startDate, 'PPP')} - {format(endDate, 'PPP')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={handleStartDateSelect}
                            disabled={(date) => isAfter(date, today)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={handleEndDateSelect}
                            disabled={(date) => (startDate ? date < startDate : false) || isAfter(date, today)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Task Selection */}
            {period === 'selection' && renderTaskSelection()}

            {/* Filters */}
            {period !== 'selection' && (
              <>
                <div className="space-y-4">
                  <Label>Include Status</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="completed"
                        checked={includeCompleted}
                        onCheckedChange={(checked) => setIncludeCompleted(checked as boolean)}
                      />
                      <Label htmlFor="completed">Completed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="in-progress"
                        checked={includeInProgress}
                        onCheckedChange={(checked) => setIncludeInProgress(checked as boolean)}
                      />
                      <Label htmlFor="in-progress">In Progress</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="not-started"
                        checked={includeNotStarted}
                        onCheckedChange={(checked) => setIncludeNotStarted(checked as boolean)}
                      />
                      <Label htmlFor="not-started">Not Started</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Include Types</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projects"
                        checked={includeProjects}
                        onCheckedChange={(checked) => setIncludeProjects(checked as boolean)}
                      />
                      <Label htmlFor="projects">Projects</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="jobs"
                        checked={includeJobs}
                        onCheckedChange={(checked) => setIncludeJobs(checked as boolean)}
                      />
                      <Label htmlFor="jobs">Jobs</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Generate Buttons */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleGenerateReport('pdf', false)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                >
                  <FilePdf className="mr-2 h-4 w-4" />
                  Basic PDF
                </Button>
                <Button 
                  onClick={() => handleGenerateReport('excel', false)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Basic Excel
                </Button>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => handleGenerateReport('pdf', true)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                  variant="outline"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  PDF with Prices
                </Button>
                <Button 
                  onClick={() => handleGenerateReport('excel', true)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                  variant="outline"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Excel with Prices
                </Button>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button 
                  onClick={() => handleGenerateReport('email', false)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email Basic Report
                </Button>
                <Button 
                  onClick={() => handleGenerateReport('email', true)} 
                  className="flex-1"
                  disabled={isGenerateDisabled()}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email with Prices
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Email Dialog */}
      <EmailReportDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        {...emailDialogData}
      />
    </Dialog>
  );
}