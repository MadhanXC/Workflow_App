"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";

export function AuthTabs() {
  return (
    <TabsList className="grid w-full grid-cols-1">
      <TabsTrigger value="admin" className="flex items-center">
        <Shield className="mr-2 h-4 w-4 text-blue-500" />
        Admin Login
      </TabsTrigger>
    </TabsList>
  );
}