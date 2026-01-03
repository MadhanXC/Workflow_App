"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { UserData } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, User, Mail, Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePreview } from "./ImagePreview";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { ImageViewer } from "@/components/shared/ImageViewer";

interface ProductListProps {
  products: Product[];
  userData: UserData;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onViewDetails: (product: Product) => void;
}

interface UploaderInfo {
  name: string;
  email: string;
}

const statusColors = {
  approved: "bg-green-100 text-green-800",
  unapproved: "bg-yellow-100 text-yellow-800"
};

export function ProductList({ products, userData, onEdit, onDelete }: ProductListProps) {
  const isAdmin = userData.role === 'admin';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [uploaderInfo, setUploaderInfo] = useState<UploaderInfo | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchUploaderInfo = async () => {
      if (isAdmin && selectedProduct?.userId && selectedProduct.userId !== userData.uid) {
        try {
          const userDocRef = doc(db, "users", selectedProduct.userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUploaderInfo({
              name: userData.name || 'Unknown User',
              email: userData.email || selectedProduct.uploaderEmail || 'No email'
            });
          }
        } catch (error) {
          console.error("Error fetching uploader info:", error);
          setUploaderInfo({
            name: 'Unknown User',
            email: selectedProduct.uploaderEmail || 'No email'
          });
        }
      }
    };

    if (selectedProduct) {
      fetchUploaderInfo();
    }
  }, [selectedProduct, isAdmin, userData.uid]);

  const handleDelete = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete);
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const handleImageClick = (index: number) => {
    if (selectedProduct) {
      setSelectedImageIndex(index);
      setImageViewerOpen(true);
    }
  };

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        {products.map((product) => {
          const isOwner = product.userId === userData.uid;
          const canEdit = isAdmin || (isOwner && product.status === 'unapproved');
          
          return (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                {/* Image Section */}
                <div className="relative h-20 sm:h-16 w-full sm:w-16 flex-shrink-0">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedImageIndex(0);
                      setImageViewerOpen(true);
                    }}
                  />
                </div>

                {/* Content Section */}
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    {/* Title and Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-base truncate">{product.name}</h3>
                        <Badge className={statusColors[product.status]}>
                          {product.status}
                        </Badge>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowDetails(true);
                        }}
                        className="hover:bg-primary/90 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="default"
                            size="xs"
                            onClick={() => onEdit(product)}
                            className="hover:bg-primary/90 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Update
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => handleDelete(product.id)}
                            className="text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{isOwner ? "Created by you" : uploaderInfo?.name || "Unknown User"}</span>
                    </div>
                    {!isOwner && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{product.uploaderEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {selectedProduct.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(index)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <Badge className={statusColors[selectedProduct.status]}>
                      Status: {selectedProduct.status}
                    </Badge>
                    {isAdmin && (
                      <>
                        {selectedProduct.description && (
                          <p className="text-gray-700">{selectedProduct.description}</p>
                        )}
                        {selectedProduct.serialNumber && (
                          <p className="text-sm text-gray-600">
                            <strong>Serial Number:</strong> {selectedProduct.serialNumber}
                          </p>
                        )}
                        {selectedProduct.purchaseDate && (
                          <p className="text-sm text-gray-600">
                            <strong>Purchase Date:</strong> {new Date(selectedProduct.purchaseDate).toLocaleDateString()}
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-sm text-gray-600">
                      <strong>Added:</strong> {new Date(selectedProduct.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Warranty Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <p className="font-medium">
                        {selectedProduct.warranty.type.charAt(0).toUpperCase() + selectedProduct.warranty.type.slice(1)} Warranty
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Duration:</strong> {selectedProduct.warranty.duration} months
                      </p>
                      {selectedProduct.warranty.provider && (
                        <p className="text-sm text-gray-600">
                          <strong>Provider:</strong> {selectedProduct.warranty.provider}
                        </p>
                      )}
                      {selectedProduct.warranty.coverage.length > 0 && (
                        <p className="text-sm text-gray-600">
                          <strong>Coverage:</strong> {selectedProduct.warranty.coverage.join(', ')}
                        </p>
                      )}
                      {selectedProduct.warranty.terms && (
                        <div className="text-sm text-gray-600">
                          <strong>Terms:</strong>
                          <p className="mt-1">{selectedProduct.warranty.terms}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">Administrative Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {uploaderInfo && (
                        <>
                          <p className="text-sm text-gray-600">
                            <strong>Uploader Name:</strong> {uploaderInfo.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Uploader Email:</strong> {uploaderInfo.email}
                          </p>
                        </>
                      )}
                      <p className="text-sm text-gray-600">
                        <strong>Product ID:</strong> {selectedProduct.id}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      {selectedProduct && (
        <ImageViewer
          images={selectedProduct.images}
          initialIndex={selectedImageIndex}
          isOpen={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemType="product"
      />
    </>
  );
}