"use client";

import { MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  streamRef: MutableRefObject<MediaStream | null>;
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
  onPhotoCapture: (file: File) => void;
}

export function CameraCapture({
  videoRef,
  canvasRef,
  streamRef,
  isCameraActive,
  setIsCameraActive,
  onPhotoCapture
}: CameraCaptureProps) {
  const { toast } = useToast();

  const handleImageCapture = async () => {
    try {
      // First try the environment-facing camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
      } catch {
        // If environment camera fails, try any available camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        streamRef.current = stream;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error: any) {
      let errorMessage = "Could not access camera";
      if (error.name === "NotAllowedError") {
        errorMessage = "Camera access was denied. Please allow camera access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on your device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Camera access is restricted. Please use HTTPS.";
      }
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: errorMessage,
      });
      console.error("Camera error:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `captured-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onPhotoCapture(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          style={{ display: isCameraActive ? 'block' : 'none' }}
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        {!isCameraActive ? (
          <div className="p-8 text-center">
            <Button onClick={handleImageCapture} variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Open Camera
            </Button>
          </div>
        ) : (
          <Button onClick={capturePhoto} className="w-full mt-4">
            Take Photo
          </Button>
        )}
      </div>
    </div>
  );
}