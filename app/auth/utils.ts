import { FormData, EMAIL_REGEX, PASSWORD_MIN_LENGTH, NAME_MIN_LENGTH } from "./types";
import { FirebaseError } from "firebase/app";

export function validateForm(formData: FormData, isSignUpMode: boolean): { isValid: boolean; error: string | null } {
  const { email, password, name, adminCode, userCode } = formData;
  const trimmedEmail = email.trim();
  
  if (!trimmedEmail || !password || (isSignUpMode && !name)) {
    return { isValid: false, error: "All fields are required." };
  }

  if (isSignUpMode && name.length < NAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be at least ${NAME_MIN_LENGTH} characters long.` 
    };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.` 
    };
  }

  return { isValid: true, error: null };
}

export function getAuthErrorMessage(error: FirebaseError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'An error occurred during authentication.';
  }
}