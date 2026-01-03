"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AuthForm } from "./components/AuthForm";
import { AuthTabs } from "./components/AuthTabs";
import { AuthCard } from "./components/AuthCard";
import { FormData, ADMIN_SECRET } from "./types";
import { validateForm } from "./utils";

export default function AuthPage() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
    adminCode: "",
    userCode: "",
  });
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  const { user, userData, signIn, signUp, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Handle authenticated user navigation
  useEffect(() => {
    if (user && userData) {
      router.replace("/");
    }
  }, [user, userData, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error && !error.includes("Please use the")) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    try {
      const { isValid, error: validationError } = validateForm(formData, isSignUpMode);
      if (!isValid) {
        setError(validationError);
        return;
      }

      const { email, password, name, adminCode } = formData;
      const trimmedEmail = email.trim();

      if (isSignUpMode) {
        if (adminCode !== ADMIN_SECRET) {
          setFailedAttempts(prev => prev + 1);
          
          if (failedAttempts >= 2) {
            setError("Too many failed attempts. Please contact system administrator.");
            return;
          }
          
          setError("Invalid admin code. Please check and try again.");
          return;
        }

        await signUp(trimmedEmail, password, name, 'admin');
        toast({
          title: "Account created!",
          description: "Admin account created successfully.",
        });
      } else {
        await signIn(trimmedEmail, password, 'admin');
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error: any) {
      setError(error.message);
      
      // If the error indicates the email is already in use, offer to switch to sign in
      if (error.message.includes("already registered")) {
        setError("This email is already registered. Please sign in instead.");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      adminCode: "",
      userCode: "",
    });
    setError(null);
    setFailedAttempts(0);
  };

  const handleSwitchMode = (toSignUp: boolean) => {
    setIsSignUpMode(toSignUp);
    resetForm();
  };

  // If user is authenticated, render nothing while redirect happens
  if (user && userData) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      {/* Logo */}
      <div className="mb-8">
        <svg width="48" height="48" viewBox="0 0 439.85 434.62">
          <defs>
            <linearGradient id="linear-gradient" x1="183.78" y1="181.13" x2="245.89" y2="268.76" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ee3031"></stop>
              <stop offset="1" stopColor="#7a1314"></stop>
            </linearGradient>
            <linearGradient id="linear-gradient-2" x1="209.42" y1="234.55" x2="209.42" y2="384.21" href="#linear-gradient"></linearGradient>
            <linearGradient id="linear-gradient-3" x1="156.49" y1="124.8" x2="231.65" y2="230.83" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f78f20"></stop>
              <stop offset="1" stopColor="#ffc20e"></stop>
            </linearGradient>
            <linearGradient id="linear-gradient-4" x1="214.66" y1="179.48" x2="290.99" y2="287.17" href="#linear-gradient-3"></linearGradient>
            <linearGradient id="linear-gradient-5" x1="191.89" y1="113.32" x2="306.76" y2="228.2" href="#linear-gradient-3"></linearGradient>
            <linearGradient id="linear-gradient-6" x1="124.39" y1="180.81" x2="239.27" y2="295.69" href="#linear-gradient-3"></linearGradient>
            <linearGradient id="linear-gradient-7" x1="156.43" y1="148.78" x2="271.3" y2="263.66" href="#linear-gradient-3"></linearGradient>
            <linearGradient id="linear-gradient-8" x1="153.64" y1="151.56" x2="268.52" y2="266.44" href="#linear-gradient-3"></linearGradient>
          </defs>
          <g>
            <polygon points="299.23 99.07 170.93 227.36 218.09 227.36 119.62 335.55 277.73 206.56 227.8 206.56 299.23 99.07" fill="url(#linear-gradient)"></polygon>
            <polygon points="299.23 99.07 197.18 216.92 244.5 216.92 119.62 335.55 277.73 206.56 227.8 206.56 299.23 99.07" fill="url(#linear-gradient-2)"></polygon>
            <g>
              <path d="M168.27,272.22c-16.39-19.8-29.81-45.22-29.49-75.25,10.04-8.64,22.06-25.91,13.82-44.62,5.07-2.64,11.27-7.33,15.07-15.43h84.31l13.3-13.3h-107.12l-1.42,4.74c-3.44,11.47-14.62,13.95-15.04,14.04l-10.29,1.99,6.19,8.46c13.08,17.9-7.01,33.78-9.33,35.52l-2.56,1.89-.13,3.18c-1.25,30.74,10.35,61.12,33.64,88.73l9.07-9.96Z" fill="url(#linear-gradient-3)"></path>
              <path d="M320.15,193.45l-.14-3.17-2.53-1.89c-2.33-1.75-22.43-17.63-9.35-35.53l6.02-8.32-10.07-2.12c-.47-.1-11.65-2.58-15.09-14.05l-.39-1.29-8.74,13.15c3.78,6.1,8.92,9.87,13.26,12.13-8.24,18.71,3.78,35.98,13.82,44.62.7,67.65-68.5,112.08-84.09,121.23-6.35-3.71-21.56-13.25-37.34-27.83l-10.45,8.53c22.32,20.98,43.76,32.33,44.71,32.83l3.09,1.62,3.09-1.62c.99-.52,24.64-13.04,48.16-36.13,31.58-31.02,47.5-66.34,46.05-102.14Z" fill="url(#linear-gradient-4)"></path>
            </g>
            <g>
              <path d="M288.39,199.91c-2-2.45-4.02-5.21-5.87-8.32-6.32-10.67-8.7-21.96-7.18-32.88-1.6-1.44-3.12-3.06-4.58-4.79l-30.56,45.99h48.19Z" fill="url(#linear-gradient-5)"></path>
              <path d="M162.25,234.01c4.34,9.75,10.13,18.66,16.54,26.64l24.25-26.64h-40.8Z" fill="url(#linear-gradient-6)"></path>
              <path d="M225.1,152.44l-44.05,43.26,34.38-43.26h-39.22c-1.82,2.34-3.79,4.42-5.84,6.27,1.53,10.92-.85,22.21-7.17,32.88-2.74,4.62-5.86,8.53-8.74,11.65.57,9.01,2.6,17.55,5.64,25.56l76.37-76.37h-11.36Z" fill="url(#linear-gradient-7)"></path>
              <path d="M197.64,280.47c2.33,2.1,4.64,4.08,6.9,5.95l56.63-46.34-51.12,50.72c4.77,3.67,9.16,6.74,12.79,9.13,20.52-13.5,64.73-47.94,68.32-95.76l-93.53,76.3Z" fill="url(#linear-gradient-8)"></path>
            </g>
          </g>
          <g fill="#82c341">
            <path d="M84.72,58.02c-2.17,1.84-4.34,3.76-6.45,5.71l28.86,31.28c1.68-1.55,3.41-3.06,5.16-4.55l-27.57-32.45Z"></path>
            <path d="M176.77,12.85c-2.81.59-5.64,1.25-8.41,1.95l10.48,41.24c2.21-.56,4.45-1.07,6.69-1.54l-8.76-41.65Z"></path>
            <path d="M143.68,22.74c-2.66,1.04-5.34,2.16-7.96,3.31l17.18,38.97c2.09-.92,4.2-1.79,6.33-2.62l-15.55-39.65Z"></path>
            <path d="M112.74,37.94c-2.45,1.46-4.91,3.01-7.31,4.58l23.36,35.6c1.91-1.25,3.84-2.48,5.8-3.66l-21.86-36.52Z"></path>
            <path d="M60.38,82.41c-1.85,2.18-3.68,4.44-5.45,6.71l33.62,26.14c1.41-1.81,2.84-3.59,4.32-5.34l-32.49-27.51Z"></path>
            <path d="M25.17,141.54c-1.04,2.68-2.04,5.41-2.97,8.12l40.29,13.79c.75-2.18,1.53-4.34,2.37-6.47l-39.69-15.43Z"></path>
            <path d="M15.35,174.7c-.58,2.82-1.11,5.67-1.57,8.48l42.01,6.91c.37-2.27.77-4.53,1.23-6.77l-41.67-8.62Z"></path>
            <path d="M53.7,210.59l-42.54-1.66c-.11,2.79-.16,5.61-.16,8.38v.18h42.54c0-.06,0-.12,0-.18,0-2.25.08-4.49.17-6.72Z"></path>
            <path d="M40.34,110.48c-1.47,2.46-2.91,5-4.28,7.53l37.42,20.24c1.09-2.02,2.24-4,3.42-5.97l-36.56-21.8Z"></path>
            <path d="M210.99,8.56c-2.86.12-5.75.3-8.6.54l3.54,42.44c2.28-.19,4.56-.35,6.86-.45l-1.8-42.53Z"></path>
            <path d="M420.1,157.32c-.82-2.74-1.71-5.51-2.66-8.25l-40.25,13.91c.74,2.16,1.46,4.33,2.12,6.52l40.79-12.18Z"></path>
            <path d="M389.75,95.58c-1.66-2.31-3.4-4.63-5.16-6.89l-33.55,26.22c1.41,1.8,2.78,3.64,4.12,5.5l34.59-24.84Z"></path>
            <path d="M407.48,125.17c-1.26-2.57-2.6-5.15-3.97-7.67l-37.36,20.35c1.09,2,2.12,4.04,3.13,6.09l38.2-18.78Z"></path>
            <path d="M427.22,191.09c-.35-2.83-.77-5.71-1.25-8.55l-41.99,7.04c.38,2.25.7,4.52.99,6.79l42.26-5.28Z"></path>
            <path d="M245.4,9.92c-2.84-.35-5.72-.64-8.58-.87l-3.41,42.45c2.29.18,4.57.41,6.84.69l5.14-42.28Z"></path>
            <path d="M341.09,47.08c-2.33-1.66-4.73-3.3-7.13-4.87l-23.27,35.66c1.92,1.25,3.81,2.55,5.68,3.88l24.72-34.68Z"></path>
            <path d="M12.61,243.32c.35,2.84.77,5.71,1.24,8.54l42-6.99c-.38-2.25-.69-4.52-.98-6.8l-42.26,5.25Z"></path>
            <path d="M279.21,16.91c-2.74-.81-5.55-1.58-8.34-2.28l-10.35,41.29c2.23.56,4.43,1.18,6.62,1.83l12.07-40.84Z"></path>
            <path d="M311.42,29.43c-2.59-1.26-5.23-2.48-7.85-3.63l-17.06,39.01c2.11.92,4.2,1.87,6.26,2.87l18.65-38.25Z"></path>
            <path d="M367.43,69.34c-2.02-2.02-4.12-4.03-6.23-5.97l-28.78,31.35c1.69,1.55,3.35,3.13,4.98,4.74l30.04-30.13Z"></path>
            <path d="M379.35,352.35c1.86-2.19,3.68-4.44,5.43-6.68l-33.57-26.19c-1.41,1.81-2.85,3.6-4.34,5.35l32.48,27.51Z"></path>
            <path d="M354.97,376.73c2.18-1.85,4.35-3.77,6.46-5.71l-28.83-31.3c-1.69,1.55-3.41,3.06-5.16,4.54l27.53,32.47Z"></path>
            <path d="M19.69,277.1c.82,2.75,1.71,5.52,2.64,8.23l40.27-13.86c-.74-2.16-1.45-4.33-2.11-6.53l-40.8,12.16Z"></path>
            <path d="M295.97,411.95c2.65-1.04,5.33-2.15,7.96-3.3l-17.13-38.98c-2.09.92-4.2,1.78-6.33,2.62l15.5,39.66Z"></path>
            <path d="M262.87,421.81c2.81-.59,5.64-1.24,8.42-1.95l-10.44-41.25c-2.21.56-4.44,1.07-6.69,1.54l8.7,41.65Z"></path>
            <path d="M399.41,324.3c1.48-2.47,2.91-5,4.27-7.51l-37.39-20.28c-1.1,2.02-2.25,4-3.43,5.97l36.54,21.82Z"></path>
            <path d="M424.46,260.13c.58-2.79,1.11-5.64,1.58-8.47l-42-6.96c-.37,2.27-.77,4.53-1.24,6.77l41.66,8.67Z"></path>
            <path d="M386.31,216.94c0,.13,0,.25,0,.37,0,2.31-.08,4.59-.17,6.88l42.53,1.72c.12-2.84.17-5.74.17-8.6v-.37h-42.54Z"></path>
            <path d="M414.6,293.28c1.05-2.69,2.05-5.43,2.98-8.14l-40.28-13.81c-.75,2.18-1.54,4.33-2.37,6.46l39.67,15.49Z"></path>
            <path d="M326.93,396.78c2.46-1.47,4.92-3.01,7.31-4.58l-23.33-35.61c-1.91,1.25-3.84,2.48-5.81,3.65l21.83,36.54Z"></path>
            <path d="M49.98,338.85c1.67,2.33,3.41,4.65,5.16,6.9l33.57-26.19c-1.41-1.81-2.78-3.64-4.11-5.5l-34.61,24.8Z"></path>
            <path d="M228.63,426.05c2.86-.12,5.77-.29,8.62-.53l-3.5-42.44c-2.28.19-4.56.35-6.86.44l1.73,42.53Z"></path>
            <path d="M32.28,309.26c1.26,2.56,2.59,5.13,3.96,7.65l37.38-20.3c-1.09-2.01-2.12-4.05-3.13-6.1l-38.21,18.75Z"></path>
            <path d="M98.6,387.41c2.34,1.67,4.74,3.31,7.12,4.87l23.3-35.63c-1.92-1.26-3.81-2.56-5.68-3.89l-24.74,34.65Z"></path>
            <path d="M72.28,365.12c2.01,2.01,4.11,4.02,6.23,5.97l28.81-31.31c-1.69-1.55-3.36-3.12-4.98-4.74l-30.06,30.09Z"></path>
            <path d="M194.24,424.66c2.83.35,5.72.64,8.58.87l3.44-42.44c-2.29-.19-4.57-.42-6.84-.7l-5.19,42.26Z"></path>
            <path d="M160.44,417.63c2.75.81,5.55,1.58,8.34,2.28l10.39-41.27c-2.23-.56-4.43-1.19-6.62-1.84l-12.11,40.82Z"></path>
            <path d="M128.23,405.08c2.59,1.27,5.23,2.49,7.86,3.64l17.09-38.99c-2.1-.92-4.19-1.87-6.25-2.88l-18.7,38.22Z"></path>
          </g>
        </svg>
      </div>

      <AuthCard isSignUpMode={isSignUpMode}>
        <Tabs
          defaultValue="admin"
          value="admin"
          className="mb-6"
        >
          <AuthTabs />
          <TabsContent value="admin">
            <AuthForm
              formData={formData}
              isSignUpMode={isSignUpMode}
              error={error}
              isSubmitting={loading}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onSwitchMode={handleSwitchMode}
            />
          </TabsContent>
        </Tabs>
      </AuthCard>
    </div>
  );
}