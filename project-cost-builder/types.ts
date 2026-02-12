export interface Product {
  id: string;
  code: string;
  name: string;
  value: number;
}

export interface TemplateItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  value: number;
}

export interface RouteTemplate {
  id: string;
  name: string;
  items: TemplateItem[];
}

export interface ItemRota {
  id: string;
  projectRouteId: string;
  code: string;
  name: string;
  quantity: number;
  value: number;
  totalCalculado: number;
}

export interface ProjectRoute {
  id: string;
  projectId: string;
  name: string; // The specific name in this project (copied from template)
  items: ItemRota[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  routes: ProjectRoute[];
}

export interface AppConfig {
  equipmentPercentage: number; // e.g., 80
}

export interface AppState {
  products: Product[];
  routeTemplates: RouteTemplate[];
  projects: Project[];
  config: AppConfig;
}

// Add Global Window Definition
declare global {
  interface Window {
    electronAPI?: {
      loadState: () => Promise<AppState>;
      saveState: (state: AppState) => Promise<{ success: boolean; error?: any }>;
    }
  }
}
