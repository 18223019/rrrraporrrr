/**
 * TestDashboardDirect - Direct access to dashboard without auth
 * For testing UI components only
 */

import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from './DashboardPage';

export const TestDashboardDirect: React.FC = () => {
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
};

export default TestDashboardDirect;
