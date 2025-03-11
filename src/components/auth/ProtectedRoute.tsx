
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    toast({
      title: "Access Restricted",
      description: "Please sign in to access this page",
      variant: "destructive",
    });
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
