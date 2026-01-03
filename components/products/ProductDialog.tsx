"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, Camera, X, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductImage, Product } from "@/types/product";
import { CameraCapture } from "./CameraCapture";
import { ImagePreview } from "./ImagePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  editingProduct: Product | null;
}

const COVERAGE_OPTIONS = [
  'Parts',
  'Labor',
  'Accidental Damage',
  'Technical Support',
  'Replacement',
  'Repair',
];

const STATUS_OPTIONS = ['approved', 'unapproved'] as const;

const statusColors = {
  approved: "bg-green-100 text-green-800",
  unapproved: "bg-yellow-100 text-yellow-800"
};

export function ProductDialog({ isOpen, onOpenChange, onSave, editingProduct }: ProductDialogProps) {
  const { toast } = useToast();
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';
  
  // State management
  const [showPreview, setShowPreview] = useState(false);
  const [imageSource, setImageSource] = useState<string>("");
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>("unapproved");
  const [warranty, setWarranty] = useState({
    type: 'basic' as const,
    duration: 12,
    coverage: [] as string[],
    provider: '',
    terms: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset form when editing product changes
  useEffect(() => {
    if (editingProduct) {
      const isApproved = editingProduct.status === 'approved';
      const isDisabled = isApproved && !isAdmin;

      setProductName(editingProduct.name);
      setDescription(editingProduct.description || '');
      setSerialNumber(editingProduct.serialNumber || '');
      // Safely handle date conversion
      if (editingProduct.purchaseDate) {
        try {
          const date = new Date(editingProduct.purchaseDate);
          if (!isNaN(date.getTime())) {
            setPurchaseDate(date.toISOString().split('T')[0]);
          } else {
            setPurchaseDate('');
          }
        } catch (error) {
          console.error("Error parsing purchase date:", error);
          setPurchaseDate('');
        }
      } else {
        setPurchaseDate('');
      }
      setWarranty(editingProduct.warranty);
      setExistingImages(editingProduct.images);
      setStatus(editingProduct.status);

      if (isDisabled) {
        toast({
          title: "Notice",
          description: "This product is approved and cannot be modified",
          duration: 5000,
        });
      }
    } else {
      resetForm();
    }
  }, [editingProduct, isAdmin, toast]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      const totalImages = productImages.length + existingImages.length;
      const remainingSlots = 5 - totalImages;
      
      if (files.length > remainingSlots) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "A maximum of 5 images can be uploaded",
        });
        return;
      }

      const newImages = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setProductImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setProductImages(prev => {
        const newImages = [...prev];
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        return newImages;
      });
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a product name",
      });
      return;
    }

    if (!editingProduct && productImages.length === 0 && existingImages.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one image",
      });
      return;
    }

    setIsUploading(true);
    try {
      const productData: Partial<Product> = {
        name: productName,
        description,
        serialNumber,
        warranty,
        images: productImages.map(img => img.file),
        existingImages,
        status: isAdmin ? status : 'unapproved',
      };

      // Only include purchaseDate if it's a valid date
      if (purchaseDate) {
        try {
          const date = new Date(purchaseDate);
          if (!isNaN(date.getTime())) {
            productData.purchaseDate = date;
          }
        } catch (error) {
          console.error("Error parsing purchase date:", error);
        }
      }

      await onSave(productData);
      
      cleanup();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: editingProduct ? "Failed to update product" : "Failed to add product",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cleanup = () => {
    productImages.forEach(image => {
      URL.revokeObjectURL(image.preview);
    });
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const resetForm = () => {
    cleanup();
    setProductImages([]);
    setProductName("");
    setDescription("");
    setSerialNumber("");
    setPurchaseDate("");
    setWarranty({
      type: 'basic',
      duration: 12,
      coverage: [],
      provider: '',
      terms: '',
    });
    setStatus('unapproved');
    setImageSource("");
    setShowPreview(false);
    setExistingImages([]);
    setIsCameraActive(false);
  };

  const renderBasicForm = () => {
    const isDisabled = editingProduct?.status === 'approved' && !isAdmin;

    return (
      <div className="space-y-6">
        {isDisabled && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-yellow-700">
              This product is approved and cannot be modified
            </p>
          </div>
        )}
        <div className="space-y-4">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Product Name
          </label>
          <Input
            placeholder="Enter product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={isDisabled}
          />
        </div>
        
        <div className="space-y-4">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Add Images
          </label>
          <Select
            value={imageSource}
            onValueChange={(value) => {
              setImageSource(value);
              if (value !== "camera") {
                cleanup();
              }
            }}
            disabled={isDisabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose how to add images" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upload">
                <div className="flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </div>
              </SelectItem>
              <SelectItem value="camera">
                <div className="flex items-center">
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {imageSource === "upload" && (
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                multiple
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                disabled={isDisabled}
              />
            </div>
          )}
          
          {imageSource === "camera" && (
            <div className="mt-2">
              <CameraCapture
                videoRef={videoRef}
                canvasRef={canvasRef}
                streamRef={streamRef}
                isCameraActive={isCameraActive}
                setIsCameraActive={setIsCameraActive}
                onPhotoCapture={(file) => {
                  setProductImages(prev => [...prev, {
                    file,
                    preview: URL.createObjectURL(file)
                  }]);
                }}
                disabled={isDisabled}
              />
            </div>
          )}

          <ImagePreview
            existingImages={existingImages}
            newImages={productImages}
            onRemove={isDisabled ? undefined : removeImage}
          />
        </div>
      </div>
    );
  };

  const renderAdminForm = () => {
    const isDisabled = editingProduct?.status === 'approved' && !isAdmin;

    return (
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-8 pr-4">
          {renderBasicForm()}
          
          <Separator className="my-6" />
          
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Additional Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Enter product description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-y"
                  disabled={isDisabled}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Serial Number</label>
                <Input
                  placeholder="Enter serial number"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  disabled={isDisabled}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Date</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={status}
                  onValueChange={(value: typeof STATUS_OPTIONS[number]) => setStatus(value)}
                  disabled={isDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Warranty Information</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Warranty Type</label>
                  <Select
                    value={warranty.type}
                    onValueChange={(value: 'basic' | 'extended' | 'lifetime') => 
                      setWarranty(prev => ({ ...prev, type: value }))
                    }
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warranty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Warranty</SelectItem>
                      <SelectItem value="extended">Extended Warranty</SelectItem>
                      <SelectItem value="lifetime">Lifetime Warranty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (months)</label>
                  <Input
                    type="number"
                    min="0"
                    value={warranty.duration}
                    onChange={(e) => setWarranty(prev => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 0
                    }))}
                    disabled={isDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Input
                    placeholder="Enter warranty provider"
                    value={warranty.provider}
                    onChange={(e) => setWarranty(prev => ({
                      ...prev,
                      provider: e.target.value
                    }))}
                    disabled={isDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Coverage</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COVERAGE_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center space-x-2 text-sm bg-secondary/50 p-2 rounded-md hover:bg-secondary/70 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={warranty.coverage.includes(option)}
                          onChange={(e) => {
                            const newCoverage = e.target.checked
                              ? [...warranty.coverage, option]
                              : warranty.coverage.filter(item => item !== option);
                            setWarranty(prev => ({
                              ...prev,
                              coverage: newCoverage
                            }));
                          }}
                          className="rounded border-gray-300"
                          disabled={isDisabled}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Terms and Conditions</label>
                  <Textarea
                    placeholder="Enter warranty terms and conditions"
                    value={warranty.terms}
                    onChange={(e) => setWarranty(prev => ({
                      ...prev,
                      terms: e.target.value
                    }))}
                    className="min-h-[100px] resize-y"
                    disabled={isDisabled}
                  />
                </div>
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
            <h3 className="text-lg font-semibold">Basic Details</h3>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <p><strong>Name:</strong> {productName}</p>
              {isAdmin && (
                <>
                  <p><strong>Description:</strong> {description || 'None'}</p>
                  {serialNumber && <p><strong>Serial Number:</strong> {serialNumber}</p>}
                  {purchaseDate && (
                    <p><strong>Purchase Date:</strong> {new Date(purchaseDate).toLocaleDateString()}</p>
                  )}
                  <Badge className={statusColors[status]}>
                    Status: {status}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Warranty Information</h3>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                <p><strong>Type:</strong> {warranty.type.charAt(0).toUpperCase() + warranty.type.slice(1)}</p>
                <p><strong>Duration:</strong> {warranty.duration} months</p>
                {warranty.provider && <p><strong>Provider:</strong> {warranty.provider}</p>}
                {warranty.coverage.length > 0 && (
                  <p><strong>Coverage:</strong> {warranty.coverage.join(', ')}</p>
                )}
                {warranty.terms && (
                  <div>
                    <strong>Terms:</strong>
                    <p className="mt-1 whitespace-pre-wrap">{warranty.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Images</h3>
            <ImagePreview
              existingImages={existingImages}
              newImages={productImages}
              readonly
            />
          </div>
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
              disabled={isUploading || (editingProduct?.status === 'approved' && !isAdmin)}
            >
              {isUploading ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingProduct ? 'Update' : 'Save'}
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
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="h-full">
              {isAdmin ? renderAdminForm() : renderBasicForm()}
              
              <div className="sticky bottom-0 pt-4 bg-background">
                <Button
                  onClick={() => setShowPreview(true)}
                  disabled={!productName.trim() || (editingProduct?.status === 'approved' && !isAdmin)}
                  className="w-full"
                >
                  Review & {editingProduct ? 'Update' : 'Save'}
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