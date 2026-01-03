"use client";

import { useState, useEffect } from "react";
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

interface TaskCardProps {
  task: Task;
  userData: UserData;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
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

import { Phone, MessageSquare } from "lucide-react";

export function TaskCard({ task, userData, onEdit, onDelete }: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploaderInfo, setUploaderInfo] = useState<UploaderInfo | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  const isAdmin = userData.role === 'admin';
  const isOwner = task.userId === userData.uid;
  const isCompleted = task.status === 'completed';
  const canDelete = isAdmin;
  const canModify = isAdmin;

  useEffect(() => {
    const fetchUploaderInfo = async () => {
      if (isAdmin && task.userId && !isOwner) {
        try {
          const userDocRef = doc(db, "users", task.userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUploaderInfo({
              name: userData.name || 'Unknown User',
              email: userData.email || task.uploaderEmail || 'No email'
            });
          }
        } catch (error) {
          console.error("Error fetching uploader info:", error);
          setUploaderInfo({
            name: 'Unknown User',
            email: task.uploaderEmail || 'No email'
          });
        }
      }
    };

    fetchUploaderInfo();
  }, [isAdmin, task.userId, task.uploaderEmail, isOwner]);

  const handleDelete = () => {
    setTaskToDelete(task.id);
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
      <div 
        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 hover:border-gray-200"
        data-task-id={task.id}
      >
        {/* Content Section */}
        <div className="flex-grow p-4">
          <div className="space-y-3">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base sm:text-lg line-clamp-1">{task.title}</h3>
                  <Badge className={statusColors[task.status]}>
                    {task.status.replace(/-/g, ' ')}
                  </Badge>
                  <Badge className={workConfirmationColors[task.workConfirmationStatus]}>
                    {task.workConfirmationStatus === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
                  </Badge>
                  {/* Type Badge */}
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
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span>{task.site}</span>
                </div>
              </div>
              {isCompleted && !isAdmin && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>

            {/* Priority and Source */}
            <div className="flex flex-wrap gap-2">
              <Badge className={priorityColors[task.priority || 'medium']}>
                <Flag className="h-3 w-3 mr-1" />
                {task.priority || 'Medium'} Priority
              </Badge>
              <Badge variant="outline">
                {task.source === 'call' && <Phone className="h-3 w-3 mr-1" />}
                {task.source === 'text' && <MessageSquare className="h-3 w-3 mr-1" />}
                {task.source === 'email' && <Mail className="h-3 w-3 mr-1" />}
                {task.source === 'in-person' && <User className="h-3 w-3 mr-1" />}
                {task.source || 'Call'}
              </Badge>
              {task.requiresMaterial && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Package className="h-3 w-3 mr-1" />
                  {task.materialStatus ? (
                    <span>Material Status: {task.materialStatus.replace(/-/g, ' ')}</span>
                  ) : (
                    'Material Required'
                  )}
                </Badge>
              )}
              {task.images.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3 mr-1" />
                  {task.images.length} Document{task.images.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Meta Information */}
            <div className="space-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span>{isOwner ? "Created by you" : uploaderInfo?.name || "Unknown User"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="p-4 pt-0 border-t border-gray-100 mt-auto">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="flex-1 hover:bg-primary/90"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            {canModify && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="flex-1 hover:bg-primary/90"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
          </DialogHeader>
          
          {task && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusColors[task.status]}>
                    Status: {task.status.replace(/-/g, ' ')}
                  </Badge>
                  <Badge className={workConfirmationColors[task.workConfirmationStatus]}>
                    Work Confirmation: {task.workConfirmationStatus === 'awaiting' ? 'Awaiting Confirmation' : 'Confirmed'}
                  </Badge>
                  <Badge className={priorityColors[task.priority || 'medium']}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority || 'Medium'} Priority
                  </Badge>
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
                  <Badge variant="outline">
                    {task.source === 'call' && <Phone className="h-3 w-3 mr-1" />}
                    {task.source === 'text' && <MessageSquare className="h-3 w-3 mr-1" />}
                    {task.source === 'email' && <Mail className="h-3 w-3 mr-1" />}
                    {task.source === 'in-person' && <User className="h-3 w-3 mr-1" />}
                    Source: {task.source || 'Call'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-700"><strong>Site:</strong> {task.site}</p>
                    <div className="text-gray-700">
                      <strong>Description:</strong><br />
                      {task.description}
                    </div>
                    {task.workConfirmationStatus === 'confirmed' && (
                      <>
                        {task.poNumber && (
                          <p className="text-gray-700">
                            <strong>PO Number:</strong> {task.poNumber}
                          </p>
                        )}
                        {task.dateInitiated && (
                          <p className="text-gray-700">
                            <strong>Date Initiated:</strong> {format(task.dateInitiated, 'PPP')}
                          </p>
                        )}
                        {task.dateCompleted && (
                          <p className="text-gray-700">
                            <strong>Date Completed:</strong> {format(task.dateCompleted, 'PPP')}
                          </p>
                        )}
                        {task.quotedPrice !== null && (
                          <p className="text-gray-700">
                            <strong>Quoted Price:</strong> ${task.quotedPrice.toFixed(2)}
                          </p>
                        )}
                        {task.confirmedPrice !== null && (
                          <p className="text-gray-700">
                            <strong>Confirmed Price:</strong> ${task.confirmedPrice.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {task.notes && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">POCs</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{task.notes}</p>
                    </div>
                  </div>
                )}

                {task.requiresMaterial && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Material Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {task.materialStatus && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="h-3 w-3 mr-1" />
                          Material Status: {task.materialStatus.replace(/-/g, ' ')}
                        </Badge>
                      )}
                      {task.materialDescription && (
                        <p className="text-gray-700 mt-2">
                          <strong>Description:</strong><br />
                          {task.materialDescription}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {task.images.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Documents</h3>
                    <ImagePreview
                      existingImages={task.images}
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
                        <strong>Created:</strong> {format(task.createdAt, 'PPP pp')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Last Updated:</strong> {format(task.updatedAt, 'PPP pp')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Task ID:</strong> {task.id}
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