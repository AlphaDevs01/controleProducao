import { AppState } from '../types';

const DB_KEY = 'project_cost_builder_db';

const DEFAULT_STATE: AppState = {
  products: [],
  routeTemplates: [
    { id: 'rt_1', name: 'CHAPARIA', items: [] },
    { id: 'rt_2', name: 'PINTURA', items: [] },
  ],
  projects: [],
  config: {
    equipmentPercentage: 80
  }
};

const isElectron = () => {
  return window.electronAPI !== undefined;
};

export const loadState = async (): Promise<AppState> => {
  try {
    if (isElectron() && window.electronAPI) {
      console.log("Loading from Database...");
      const data = await window.electronAPI.loadState();
      
      // Se retornar null (erro no main process), usamos o estado padrão para não travar o app
      if (data === null) {
          console.warn("DB returned null, falling back to default state");
          return DEFAULT_STATE;
      }

      if (!data || (!data.projects && !data.products)) {
        return DEFAULT_STATE;
      }
      return data;
    } else {
      const serialized = localStorage.getItem(DB_KEY);
      if (!serialized) return DEFAULT_STATE;
      return JSON.parse(serialized);
    }
  } catch (e) {
    console.error("Failed to load state", e);
    // Retornar default em vez de jogar erro permite que o app abra mesmo sem banco
    return DEFAULT_STATE; 
  }
};

let saveTimeout: any = null;

// Modified: No debounce for Electron to ensure data persistence
export const saveState = (state: AppState, onComplete?: (success: boolean) => void) => {
  const doSave = async () => {
    try {
      if (isElectron() && window.electronAPI) {
         const result = await window.electronAPI.saveState(state);
         if (result && result.success) {
             console.log("Saved to DB Successfully");
             if (onComplete) onComplete(true);
         } else {
             console.error("CRITICAL: Failed to save to Database.", result?.error);
             if (onComplete) onComplete(false);
         }
      } else {
         localStorage.setItem(DB_KEY, JSON.stringify(state));
         console.log("Saved to LocalStorage");
         if (onComplete) onComplete(true);
      }
    } catch (e) {
      console.error("Failed to save state (Exception)", e);
      if (onComplete) onComplete(false);
    }
  };

  if (isElectron()) {
      // Immediate save for Electron to prevent data loss on close
      doSave();
  } else {
      // Debounce for web to save resources
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(doSave, 1000); 
  }
};