"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, LogIn, UserPlus, Loader2 } from "lucide-react";
import { FormData } from "../types";

interface AuthFormProps {
  formData: FormData;
  isSignUpMode: boolean;
  error: string | null;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchMode: (toSignUp: boolean) => void;
}

export function AuthForm({
  formData,
  isSignUpMode,
  error,
  isSubmitting,
  onInputChange,
  onSubmit,
  onSwitchMode,
}: AuthFormProps) {
  // Check if error suggests switching to sign in
  const shouldOfferSignIn = error?.includes("already registered");

  if (isSignUpMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            type="button"
            onClick={() => onSwitchMode(false)}
            className="text-sm"
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
          </Button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <AuthError error={error} />}
          <div className="space-y-2">
            <Input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={onInputChange}
              disabled={isSubmitting}
              required
            />
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={onInputChange}
              disabled={isSubmitting}
              required
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={onInputChange}
              disabled={isSubmitting}
              required
            />
            <Input
              type="password"
              name="adminCode"
              placeholder="Admin Code"
              value={formData.adminCode}
              onChange={onInputChange}
              disabled={isSubmitting}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" /> Create Account
              </>
            )}
          </Button>
          
          {shouldOfferSignIn && (
            <div className="text-center mt-2">
              <Button
                variant="link"
                type="button"
                onClick={() => onSwitchMode(false)}
                disabled={isSubmitting}
              >
                Sign in with this email instead
              </Button>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <AuthError error={error} />}
      <div className="space-y-2">
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={onInputChange}
          disabled={isSubmitting}
          required
        />
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={onInputChange}
          disabled={isSubmitting}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
          </>
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" /> Sign In
          </>
        )}
      </Button>
      <div className="text-center">
        <Button
          variant="link"
          type="button"
          onClick={() => onSwitchMode(true)}
          disabled={isSubmitting}
        >
          Need an account? Sign Up
        </Button>
      </div>
    </form>
  );
}

function AuthError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}