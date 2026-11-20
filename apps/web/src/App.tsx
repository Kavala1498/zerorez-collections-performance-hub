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
        <Route path="upload" element={<UploadPage />} />
        <Route path="cargar" element={<Navigate to="/upload" replace />} />
        <Route path="bases/:id" element={<BasePage />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
