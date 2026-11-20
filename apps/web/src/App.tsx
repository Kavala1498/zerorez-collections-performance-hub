import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BasePage } from './pages/BasePage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="cargar" element={<UploadPage />} />
        <Route path="bases/:id" element={<BasePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
