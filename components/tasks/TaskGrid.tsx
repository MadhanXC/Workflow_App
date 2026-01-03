import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Grid2X2, List, Search, SortAsc, Filter, User, FileText, Clock, Building2, Briefcase, Package, Flag } from "lucide-react";
import { Task } from "@/types/task";
import { UserData } from "@/types/user";
import { TaskCard } from "./TaskCard";
import { TaskList } from "./TaskList";
import { ReportDialog } from "./ReportDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const PRIORITY_ORDER: { [key: string]: number } = {
  'urgent': 4,
  'high': 3,
  'medium': 2,
  'low': 1
};

interface TaskGridProps {
  tasks: Task[];
  userData: UserData;
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'priority-high' | 'priority-low' | 'price-high' | 'price-low';
type TaskStatus = 'not-initiated' | 'in-progress' | 'completed';
type WorkItemType = 'project' | 'job';
type MaterialStatus = 'ordered' | 'yet-to-be-shipped' | 'in-transit' | 'received';
type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface Filters {
  status: TaskStatus[];
  types: WorkItemType[];
  users: string[];
  materialStatus: MaterialStatus[];
  priorities: PriorityType[];
  requiresMaterial: boolean | null;
  hasDocuments: boolean | null;
  hasPrice: boolean | null;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

const ITEMS_PER_PAGE = 10;

const initialFilters: Filters = {
  status: [],
  types: [],
  users: [],
  materialStatus: [],
  priorities: [],
  requiresMaterial: null,
  hasDocuments: null,
  hasPrice: null,
};

export function TaskGrid({ tasks, userData, isLoading, onEdit, onDelete }: TaskGridProps) {
  const [isGridView, setIsGridView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('priority-high');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userList, setUserList] = useState<UserInfo[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData.role === 'admin') return;

      const uniqueUserIds = [...new Set(tasks.map(t => t.userId))];
      const userPromises = uniqueUserIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: userId,
              name: data.name || 'Unknown User',
              email: data.email || 'No email'
            };
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
        return null;
      });

      const users = (await Promise.all(userPromises)).filter((user): user is UserInfo => user !== null);
      setUserList(users);
    };

    fetchUsers();
  }, [tasks, userData.role]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.types.length > 0) count++;
    if (filters.users.length > 0) count++;
    if (filters.materialStatus.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.requiresMaterial !== null) count++;
    if (filters.hasDocuments !== null) count++;
    if (filters.hasPrice !== null) count++;
    return count;
  }, [filters]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return userList;
    const query = userSearchQuery.toLowerCase();
    return userList.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
  }, [userList, userSearchQuery]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => {
        const user = userList.find(u => u.id === task.userId);
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.site.toLowerCase().includes(query) ||
          (task.notes?.toLowerCase().includes(query) || false) ||
          (task.materialDescription && task.materialDescription.toLowerCase().includes(query)) ||
          (userData.role === 'admin' && (
            task.uploaderEmail?.toLowerCase().includes(query) ||
            user?.name.toLowerCase().includes(query) ||
            user?.email.toLowerCase().includes(query)
          ))
        );
      });
    }

    // Apply filters
    if (filters.status.length > 0) {
      result = result.filter(task => filters.status.includes(task.status));
    }

    if (filters.types.length > 0) {
      result = result.filter(task => filters.types.includes(task.type));
    }

    if (filters.priorities.length > 0) {
      result = result.filter(task => filters.priorities.includes(task.priority));
    }

    if (filters.users.length > 0) {
      result = result.filter(task => filters.users.includes(task.userId));
    }

    if (filters.materialStatus.length > 0) {
      result = result.filter(task => 
        task.materialStatus && filters.materialStatus.includes(task.materialStatus)
      );
    }

    if (filters.requiresMaterial !== null) {
      result = result.filter(task => task.requiresMaterial === filters.requiresMaterial);
    }

    if (filters.hasDocuments !== null) {
      result = result.filter(task => 
        filters.hasDocuments ? task.images.length > 0 : task.images.length === 0
      );
    }

    if (filters.hasPrice !== null) {
      result = result.filter(task => 
        filters.hasPrice ? (task.quotedPrice !== null || task.confirmedPrice !== null) : (task.quotedPrice === null && task.confirmedPrice === null)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'priority-high':
          const aPriorityHigh = PRIORITY_ORDER[a.priority || 'medium'];
          const bPriorityHigh = PRIORITY_ORDER[b.priority || 'medium'];
          if (aPriorityHigh !== bPriorityHigh) {
            return bPriorityHigh - aPriorityHigh;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'priority-low':
          const aPriorityLow = PRIORITY_ORDER[a.priority || 'medium'];
          const bPriorityLow = PRIORITY_ORDER[b.priority || 'medium'];
          if (aPriorityLow !== bPriorityLow) {
            return aPriorityLow - bPriorityLow;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'price-high':
          const bPrice = b.confirmedPrice || b.quotedPrice || 0;
          const aPrice = a.confirmedPrice || a.quotedPrice || 0;
          return bPrice - aPrice;
        case 'price-low':
          const bPrice2 = b.confirmedPrice || b.quotedPrice || 0;
          const aPrice2 = a.confirmedPrice || a.quotedPrice || 0;
          return aPrice2 - bPrice2;
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, sortBy, filters, userData.role, userList]);

  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTasks = filteredAndSortedTasks.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="col-span-full flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search tasks by title, site, description, POCs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9 w-full"
        />
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Button */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>

            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[100]">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(initialFilters)}
                    className="h-auto p-3 text-muted-foreground hover:text-primary"
                  >
                    Reset filters
                  </Button>
                </div>
               
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['not-initiated', 'in-progress', 'completed'] as TaskStatus[]).map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              status: checked
                                ? [...prev.status, status]
                                : prev.status.filter(s => s !== status)
                            }));
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="capitalize">
                          {status.replace(/-/g, ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Type Filter */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['project', 'job'] as WorkItemType[]).map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.types.includes(type)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              types: checked
                                ? [...prev.types, type]
                                : prev.types.filter(t => t !== type)
                            }));
                          }}
                        />
                        <Label htmlFor={`type-${type}`} className="capitalize">
                          {type === 'project' ? (
                            <div className="flex items-center">
                              <Building2 className="mr-2 h-4 w-4" />
                              Project
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Briefcase className="mr-2 h-4 w-4" />
                              Job
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['urgent', 'high', 'medium', 'low'] as PriorityType[]).map((priority) => (
                      <div key={priority} className="flex items-center space-x-2">
                        <Checkbox
                          id={`priority-${priority}`}
                          checked={filters.priorities.includes(priority)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              priorities: checked
                                ? [...prev.priorities, priority]
                                : prev.priorities.filter(p => p !== priority)
                            }));
                          }}
                        />
                        <Label htmlFor={`priority-${priority}`} className="capitalize">
                          <div className="flex items-center">
                            <Flag className="mr-2 h-4 w-4" />
                            {priority}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Material Status Filter */}
                <div className="space-y-2">
                  <Label>Material Status</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['ordered', 'yet-to-be-shipped', 'in-transit', 'received'] as MaterialStatus[]).map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`material-${status}`}
                          checked={filters.materialStatus.includes(status)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              materialStatus: checked
                                ? [...prev.materialStatus, status]
                                : prev.materialStatus.filter(s => s !== status)
                            }));
                          }}
                        />
                        <Label htmlFor={`material-${status}`} className="capitalize">
                          <div className="flex items-center">
                            <Package className="mr-2 h-4 w-4" />
                            {status.replace(/-/g, ' ')}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Additional Filters */}
                <div className="space-y-2">
                  <Label>Additional Filters</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requires-material"
                        checked={filters.requiresMaterial === true}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            requiresMaterial: checked === 'indeterminate' ? null : checked
                          }));
                        }}
                      />
                      <Label htmlFor="requires-material">Requires Material</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-documents"
                        checked={filters.hasDocuments === true}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            hasDocuments: checked === 'indeterminate' ? null : checked
                          }));
                        }}
                      />
                      <Label htmlFor="has-documents">Has Documents</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-price"
                        checked={filters.hasPrice === true}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            hasPrice: checked === 'indeterminate' ? null : checked
                          }));
                        }}
                      />
                      <Label htmlFor="has-price">Has Price Details</Label>
                    </div>
                  </div>
                </div>

                {userData.role === 'admin' && (
                  <>
                    <Separator />

                    {/* User Filter */}
                    <div className="space-y-2">
                      <Label>Filter by User</Label>
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      <ScrollArea className="h-[50px]">
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={filters.users.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    users: checked
                                      ? [...prev.users, user.id]
                                      : prev.users.filter(id => id !== user.id)
                                  }));
                                }}
                              />
                              <Label htmlFor={`user-${user.id}`} className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                  </>
                  
                )}
              </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="priority-high">Priority (High-Low)</SelectItem>
              <SelectItem value="priority-low">Priority (Low-High)</SelectItem>
              <SelectItem value="price-high">Price (High-Low)</SelectItem>
              <SelectItem value="price-low">Price (Low-High)</SelectItem>
            </SelectContent>
          </Select>

          {/* Generate Report Button */}
          <Button 
            onClick={() => setIsReportDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-primary rounded-lg p-1">
          <Button
            variant={isGridView ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsGridView(true)}
            className={`px-3 ${isGridView ? 'bg-white text-primary' : 'text-white hover:text-black/90'}`}
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button
            variant={!isGridView ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsGridView(false)}
            className={`px-3 ${!isGridView ? 'bg-white text-primary' : 'text-white hover:text-black/90'}`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAndSortedTasks.length === tasks.length ? (
          `Showing all ${tasks.length} work tasks`
        ) : (
          `Showing ${filteredAndSortedTasks.length} of ${tasks.length} work tasks`
        )}
      </div>

      {/* Task List/Grid */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No tasks match your search criteria</p>
        </div>
      ) : isGridView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userData={userData}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={currentTasks}
          userData={userData}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={(task) => {
            const element = document.querySelector(`[data-task-id="${task.id}"]`);
            if (element) {
              element.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              }));
            }
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageChange(page)}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        tasks={tasks}
      />
    </div>
  );
}