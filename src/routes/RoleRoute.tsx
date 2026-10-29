import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types/auth';

interface RoleRouteProps {
  allowedRoles: AppRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const { user, hasAnyRole } = useAuth();

  if (!user || !hasAnyRole(allowedRoles)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};
