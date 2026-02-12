import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { UIProvider } from './context/UIContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Products from './pages/Products';
import Settings from './pages/Settings';
import ProjectDetails from './pages/ProjectDetails';
import RouteDetails from './pages/RouteDetails';
import RouteTemplates from './pages/RouteTemplates';

const App: React.FC = () => {
  return (
    <UIProvider>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="projects/:projectId/route/:routeId" element={<RouteDetails />} />
              
              <Route path="products" element={<Products />} />
              <Route path="route-templates" element={<RouteTemplates />} />
              <Route path="settings" element={<Settings />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </UIProvider>
  );
};

export default App;