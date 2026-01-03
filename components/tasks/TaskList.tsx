import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, User, Mail, Eye, Clock, CheckCircle2, Building2, Briefcase, Flag, Package, Download, FileText } from "lucide-react";
import { Task } from "@/types/task";
import { UserData } from "@/types/user";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePreview } from "../products/ImagePreview";
import { doc, getDoc } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Phone, MessageSquare } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  userData: UserData;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
}

interface UploaderInfo {
  name: string;
  email: string;
}

const statusColors = {
  "not-initiated": "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 transition-colors",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 transition-colors",
  completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors"
};

const workConfirmationColors = {
  awaiting: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors",
  confirmed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 transition-colors"
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 transition-colors",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors",
  high: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 transition-colors",
  urgent: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 transition-colors"
};

export function TaskList({ tasks, userData, onEdit, onDelete, onViewDetails }: TaskListProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [uploaderInfo, setUploaderInfo] = useState<UploaderInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userList, setUserList] = useState<UserData[]>([]);
  
  const isAdmin = userData.role === 'admin';

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => {
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
  }, [tasks, searchQuery, userData.role, userList]);

  useEffect(() => {
    const fetchUploaderInfo = async () => {
      if (isAdmin && selectedTask?.userId && selectedTask.userId !== userData.uid) {
        try {
          const userDocRef = doc(db, "users", selectedTask.userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUploaderInfo({
              name: userData.name || 'Unknown User',
              email: userData.email || selectedTask.uploaderEmail || 'No email'
            });
          }
        } catch (error) {
          console.error("Error fetching uploader info:", error);
          setUploaderInfo({
            name: 'Unknown User',
            email: selectedTask.uploaderEmail || 'No email'
          });
        }
      }
    };

    fetchUploaderInfo();
  }, [selectedTask, isAdmin, userData.uid]);

  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  };

  const handleDownloadDocument = async (url: string) => {
    try {
      const path = url.split('/o/')[1]?.split('?')[0];
      if (!path) {
        throw new Error('Invalid storage URL');
      }
      
      const decodedPath = decodeURIComponent(path);
      const storageRef = ref(storage, decodedPath);
      const downloadURL = await getDownloadURL(storageRef);
      
      const link = document.createElement('a');
      link.href = downloadURL;
      link.target = '_blank';
      link.download = decodedPath.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        {tasks.map((task) => {
          const isOwner = task.userId === userData.uid;
          const isCompleted = task.status === 'completed';
          const canDelete = isAdmin;
          const canModify = isAdmin;
          
          return (
            <div key={task.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-base truncate">{task.title}</h3>
                        <Badge className={statusColors[task.status]}>
                          {task.status.replace(/-/g, ' ')}
                        </Badge>
                        <Badge className={priorityColors[task.priority || 'medium']}>
                          <Flag className="h-3 w-3 mr-1" />
                          {task.priority || 'Medium'}
                        </Badge>
                        <Badge className={workConfirmationColors[task.workConfirmationStatus]}>
                          {task.workConfirmationStatus === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
                        </Badge>
                        {isCompleted && !isAdmin && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Site:</strong> {task.site}
                      </p>
                      <div className="text-sm text-gray-600">
                        <strong>Description:</strong><br />
                        <p className="line-clamp-2">{task.description}</p>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.type === 'project' ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Project
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            Job
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="flex items-center gap-1">
                          {task.source === 'call' && <Phone className="h-3 w-3 mr-1" />}
                          {task.source === 'text' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {task.source === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {task.source === 'in-person' && <User className="h-3 w-3 mr-1" />}
                          {task.source || 'Call'}
                        </Badge>

                        {task.requiresMaterial && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Package className="h-3 w-3 mr-1" />
                            Material Status: {task.materialStatus ? task.materialStatus.replace(/-/g, ' ') : 'Required'}
                          </Badge>
                        )}

                        {task.images.length > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <FileText className="h-3 w-3 mr-1" />
                            {task.images.length} Document{task.images.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowDetails(true);
                        }}
                        className="hover:bg-primary/90 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      {canModify && (
                        <>
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => onEdit(task)}
                            className="hover:bg-primary/90 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Update
                          </Button>
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => handleDelete(task.id)}
                              className="text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(task.createdAt, 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{isOwner ? "Created by you" : uploaderInfo?.name || "Unknown User"}</span>
                    </div>
                    {!isOwner && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{task.uploaderEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusColors[selectedTask.status]}>
                    Status: {selectedTask.status.replace(/-/g, ' ')}
                  </Badge>
                  <Badge className={workConfirmationColors[selectedTask.workConfirmationStatus]}>
                    Work Confirmation: {selectedTask.workConfirmationStatus === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
                  </Badge>
                  <Badge className={priorityColors[selectedTask.priority || 'medium']}>
                    <Flag className="h-3 w-3 mr-1" />
                    {selectedTask.priority || 'Medium'} Priority
                  </Badge>
                  {selectedTask.type === 'project' ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Project
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      Job
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {selectedTask.source === 'call' && <Phone className="h-3 w-3 mr-1" />}
                    {selectedTask.source === 'text' && <MessageSquare className="h-3 w-3 mr-1" />}
                    {selectedTask.source === 'email' && <Mail className="h-3 w-3 mr-1" />}
                    {selectedTask.source === 'in-person' && <User className="h-3 w-3 mr-1" />}
                    Source: {selectedTask.source || 'Call'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-700"><strong>Site:</strong> {selectedTask.site}</p>
                    <div className="text-gray-700">
                      <strong>Description:</strong><br />
                      {selectedTask.description}
                    </div>
                    {selectedTask.workConfirmationStatus === 'confirmed' && (
                      <>
                        {selectedTask.poNumber && (
                          <p className="text-gray-700">
                            <strong>PO Number:</strong> {selectedTask.poNumber}
                          </p>
                        )}
                        {selectedTask.dateInitiated && (
                          <p className="text-gray-700">
                            <strong>Date Initiated:</strong> {format(selectedTask.dateInitiated, 'PPP')}
                          </p>
                        )}
                        {selectedTask.dateCompleted && (
                          <p className="text-gray-700">
                            <strong>Date Completed:</strong> {format(selectedTask.dateCompleted, 'PPP')}
                          </p>
                        )}
                        {selectedTask.quotedPrice !== null && (
                          <p className="text-gray-700">
                            <strong>Quoted Price:</strong> ${selectedTask.quotedPrice.toFixed(2)}
                          </p>
                        )}
                        {selectedTask.confirmedPrice !== null && (
                          <p className="text-gray-700">
                            <strong>Confirmed Price:</strong> ${selectedTask.confirmedPrice.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {selectedTask.notes && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">POCs</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.notes}</p>
                    </div>
                  </div>
                )}

                {selectedTask.requiresMaterial && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Material Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedTask.materialStatus && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="h-3 w-3 mr-1" />
                          Material Status: {selectedTask.materialStatus.replace(/-/g, ' ')}
                        </Badge>
                      )}
                      {selectedTask.materialDescription && (
                        <p className="text-gray-700 mt-2">
                          <strong>Description:</strong><br />
                          {selectedTask.materialDescription}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedTask.images.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Documents</h3>
                    <ImagePreview
                      existingImages={selectedTask.images}
                      newImages={[]}
                      readonly
                      onDownload={handleDownloadDocument}
                    />
                  </div>
                )}

                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Administrative Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {uploaderInfo && (
                        <>
                          <p className="text-sm text-gray-600">
                            <strong>Created By:</strong> {uploaderInfo.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Email:</strong> {uploaderInfo.email}
                          </p>
                        </>
                      )}
                      <p className="text-sm text-gray-600">
                        <strong>Created:</strong> {format(selectedTask.createdAt, 'PPP pp')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Last Updated:</strong> {format(selectedTask.updatedAt, 'PPP pp')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Task ID:</strong> {selectedTask.id}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemType="task"
      />
    </>
  );
}