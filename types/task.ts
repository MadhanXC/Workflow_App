"use client";

export interface TaskImage {
  file: File;
  preview: string;
}

export type WorkItemType = 'project' | 'job';
export type SourceType = 'call' | 'text' | 'email' | 'in-person';
export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';
export type MaterialStatus = 'ordered' | 'yet-to-be-shipped' | 'in-transit' | 'received' | null;
export type WorkConfirmationStatus = 'awaiting' | 'confirmed';

export interface Task {
  id: string;
  title: string;
  site: string;
  description: string;
  notes?: string;
  status: 'not-initiated' | 'in-progress' | 'completed';
  images: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  dateInitiated?: Date | null;
  dateCompleted?: Date | null;
  assignedTo?: string;
  uploaderEmail?: string;
  type: WorkItemType;
  source: SourceType;
  priority: PriorityType;
  timeSlots?: any[];
  requiresMaterial: boolean;
  materialStatus: MaterialStatus;
  materialDescription: string;
  quotedPrice?: number | null;
  confirmedPrice?: number | null;
  workConfirmationStatus: WorkConfirmationStatus;
  poNumber?: string;
}