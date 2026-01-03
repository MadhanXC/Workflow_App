export interface ProductImage {
  file: File;
  preview: string;
}

export interface WarrantyDetails {
  type: 'basic' | 'extended' | 'lifetime';
  duration: number; // in months
  coverage: string[];
  provider: string;
  terms: string;
}

export interface Product {
  id: string;
  name: string;
  images: string[];
  userId: string;
  createdAt: Date;
  uploaderEmail?: string;
  warranty: WarrantyDetails;
  description: string;
  serialNumber?: string;
  purchaseDate?: Date;
  status: 'approved' | 'unapproved';
}