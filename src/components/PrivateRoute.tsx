import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';

const PrivateRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const token = authService.getToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default PrivateRoute;


