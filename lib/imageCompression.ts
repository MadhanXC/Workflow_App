import imageCompression from 'browser-image-compression';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export async function compressImage(file: File) {
  if (!isImageFile(file)) {
    throw new Error("The file given is not an image");
  }

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

export async function uploadImage(file: File, path: string) {
  try {
    // Extract the base path and original filename
    const basePath = path.split('/').slice(0, -1).join('/');
    const timestamp = Date.now();
    const fileName = file.name;
    const fullPath = `${basePath}/${fileName}`;

    // If it's an image, compress it first
    const fileToUpload = isImageFile(file) ? await compressImage(file) : file;
    const storageRef = ref(storage, fullPath);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export interface UploadProgress {
  file: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export async function uploadMultipleImages(
  files: File[], 
  basePath: string,
  onProgress?: (progress: UploadProgress[]) => void
) {
  const progress: UploadProgress[] = files.map(file => ({
    file: file.name,
    progress: 0,
    status: isImageFile(file) ? 'compressing' : 'uploading'
  }));

  const updateProgress = (index: number, update: Partial<UploadProgress>) => {
    progress[index] = { ...progress[index], ...update };
    onProgress?.(progress);
  };

  const uploadPromises = files.map(async (file, index) => {
    try {
      // For images, compress first
      if (isImageFile(file)) {
        updateProgress(index, { status: 'compressing', progress: 0 });
        const compressedFile = await compressImage(file);
        updateProgress(index, { progress: 50 });

        // Upload compressed image
        updateProgress(index, { status: 'uploading' });
        const path = `${basePath}/${file.name}`;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        updateProgress(index, { 
          status: 'completed', 
          progress: 100,
          url: downloadURL 
        });

        return downloadURL;
      } else {
        // For non-image files, upload directly
        updateProgress(index, { status: 'uploading', progress: 0 });
        const path = `${basePath}/${file.name}`;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        updateProgress(index, { 
          status: 'completed', 
          progress: 100,
          url: downloadURL 
        });

        return downloadURL;
      }
    } catch (error: any) {
      updateProgress(index, { 
        status: 'error',
        error: error.message,
        progress: 0 
      });
      throw error;
    }
  });

  return Promise.all(uploadPromises);
}