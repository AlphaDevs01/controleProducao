import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Product, Project, RouteTemplate, ProjectRoute, ItemRota, TemplateItem } from '../types';
import { loadState, saveState } from '../services/storageService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AppContextType {
  state: AppState;
  isLoading: boolean;
  saveStatus: SaveStatus;
  // Products
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  importProducts: (products: Omit<Product, 'id'>[]) => void;
  clearProducts: () => void;
  
  // Routes Config
  addRouteTemplate: (name: string, items?: Omit<TemplateItem, 'id'>[]) => void;
  updateRouteTemplate: (id: string, name: string, items: Omit<TemplateItem, 'id'>[]) => void;
  deleteRouteTemplate: (id: string) => void;
  importRouteTemplates: (names: string[]) => void;
  
  // Projects
  addProject: (name: string, selectedRouteIds: string[]) => void;
  updateProjectName: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  
  // Inside Project Logic
  addRouteToProject: (projectId: string, templateId: string | null, customName?: string) => void;
  removeRouteFromProject: (projectId: string, routeId: string) => void;
  updateRouteName: (projectId: string, routeId: string, name: string) => void;
  addItemToRoute: (projectId: string, routeId: string, item: Omit<ItemRota, 'id' | 'totalCalculado' | 'projectRouteId'>) => void;
  updateItemInRoute: (projectId: string, routeId: string, itemId: string, updates: Partial<ItemRota>) => void;
  removeItemFromRoute: (projectId: string, routeId: string, itemId: string) => void;
  
  // Config
  updateConfig: (percentage: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_EMPTY_STATE: AppState = {
    products: [],
    routeTemplates: [],
    projects: [],
    config: { equipmentPercentage: 80 }
};

// --- Helper: Sync Prices Logic ---
// Percorre todos os projetos e templates e atualiza os valores se o código do produto existir na base atualizada
const syncPrices = (prevState: AppState, updatedProducts: Product[]): AppState => {
    // Mapa para busca rápida O(1)
    const priceMap = new Map<string, number>();
    updatedProducts.forEach(p => priceMap.set(p.code.toLowerCase(), p.value));

    // 1. Atualizar Projetos
    const newProjects = prevState.projects.map(proj => ({
        ...proj,
        routes: proj.routes.map(route => ({
            ...route,
            items: route.items.map(item => {
                const newValue = priceMap.get(item.code.toLowerCase());
                // Se achou preço e é diferente do atual, atualiza
                if (newValue !== undefined && Math.abs(newValue - item.value) > 0.001) {
                    return {
                        ...item,
                        value: newValue,
                        totalCalculado: item.quantity * newValue
                    };
                }
                // Se item estava zerado e agora tem preço, atualiza
                if (item.value === 0 && newValue !== undefined) {
                     return {
                        ...item,
                        value: newValue,
                        totalCalculado: item.quantity * newValue
                    };
                }
                return item;
            })
        }))
    }));

    // 2. Atualizar Templates (Banco de Rotas)
    const newTemplates = prevState.routeTemplates.map(tmpl => ({
        ...tmpl,
        items: tmpl.items.map(item => {
            const newValue = priceMap.get(item.code.toLowerCase());
            if (newValue !== undefined && Math.abs(newValue - item.value) > 0.001) {
                return { ...item, value: newValue };
            }
            if (item.value === 0 && newValue !== undefined) {
                return { ...item, value: newValue };
            }
            return item;
        })
    }));

    return {
        ...prevState,
        products: updatedProducts,
        projects: newProjects,
        routeTemplates: newTemplates
    };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadFailed, setLoadFailed] = useState(false);

  // Async Load on Mount
  useEffect(() => {
    const init = async () => {
        setIsLoading(true);
        try {
            const data = await loadState();
            setState(data);
            setLoadFailed(false);
        } catch (err) {
            console.error("Critical Load Error in AppContext", err);
            setLoadFailed(true);
        }
        setIsLoading(false);
    };
    init();
  }, []);

  // Force save on close (beforeunload)
  useEffect(() => {
    const handler = () => {
      try {
        if (window.electronAPI) {
          window.electronAPI.saveState(state);
        }
      } catch (e) {
        console.error("Error saving on close:", e);
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  // Persist on change
  useEffect(() => {
    if (!isLoading && !loadFailed) {
        setSaveStatus('saving');
        saveState(state, (success) => {
            setSaveStatus(success ? 'saved' : 'error');
        });
    }
  }, [state, isLoading, loadFailed]);

  const addProduct = (p: Product) => {
    setState(prev => {
        if (prev.products.some(prod => prod.id === p.id)) return prev;
        const newProducts = [...prev.products, p];
        // Ao adicionar um produto novo, ele pode ser um item que estava "zerado" nos projetos
        return syncPrices(prev, newProducts);
    });
  };

  const updateProduct = (p: Product) => {
    setState(prev => {
      const newProducts = prev.products.map(prod => prod.id === p.id ? p : prod);
      // Ao atualizar preço, recalcula tudo
      return syncPrices(prev, newProducts);
    });
  };

  const deleteProduct = (id: string) => {
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
  };

  const importProducts = (imported: Omit<Product, 'id'>[]) => {
    setState(prev => {
      const newProducts = [...prev.products];
      imported.forEach(imp => {
        const existingIndex = newProducts.findIndex(p => p.code === imp.code);
        if (existingIndex >= 0) {
          newProducts[existingIndex] = { ...newProducts[existingIndex], ...imp };
        } else {
          newProducts.push({ ...imp, id: crypto.randomUUID() });
        }
      });
      // Ao importar lote, recalcula tudo
      return syncPrices(prev, newProducts);
    });
  };

  const clearProducts = () => {
    setState(prev => ({ ...prev, products: [] }));
  };

  // --- Rotas e Projetos (Lógica Padrão) ---

  const addRouteTemplate = (name: string, items: Omit<TemplateItem, 'id'>[] = []) => {
    setState(prev => ({
      ...prev,
      routeTemplates: [...prev.routeTemplates, { 
        id: crypto.randomUUID(), 
        name,
        items: items.map(i => ({ ...i, id: crypto.randomUUID() })) 
      }]
    }));
  };

  const updateRouteTemplate = (id: string, name: string, items: Omit<TemplateItem, 'id'>[]) => {
    setState(prev => ({
      ...prev,
      routeTemplates: prev.routeTemplates.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          name,
          items: items.map(i => ({ ...i, id: crypto.randomUUID() })) 
        };
      })
    }));
  };

  const deleteRouteTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      routeTemplates: prev.routeTemplates.filter(r => r.id !== id)
    }));
  };

  const importRouteTemplates = (names: string[]) => {
    setState(prev => {
      const newRoutes = [...prev.routeTemplates];
      names.forEach(name => {
        const exists = newRoutes.some(r => r.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          newRoutes.push({ id: crypto.randomUUID(), name, items: [] });
        }
      });
      return { ...prev, routeTemplates: newRoutes };
    });
  };

  const addProject = (name: string, selectedRouteTemplateIds: string[]) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      routes: selectedRouteTemplateIds.map(tid => {
        const template = state.routeTemplates.find(t => t.id === tid);
        const routeId = crypto.randomUUID();
        const routeItems: ItemRota[] = template?.items.map(ti => {
            const globalProduct = state.products.find(p => p.code === ti.code);
            const currentPrice = globalProduct ? globalProduct.value : 0;
            return {
                id: crypto.randomUUID(),
                projectRouteId: routeId,
                code: ti.code,
                name: ti.name,
                quantity: ti.quantity,
                value: currentPrice, 
                totalCalculado: ti.quantity * currentPrice
            };
        }) || [];
        return {
          id: routeId,
          projectId: '',
          name: template ? template.name : 'Unknown',
          items: routeItems
        };
      })
    };
    setState(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
  };

  const updateProjectName = (id: string, name: string) => {
    setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, name } : p)
    }));
  };

  const deleteProject = (id: string) => {
    setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addRouteToProject = (projectId: string, templateId: string | null, customName: string = 'Nova Rota') => {
      setState(prev => {
          const template = templateId ? prev.routeTemplates.find(t => t.id === templateId) : null;
          const routeName = template ? template.name : customName;
          return {
              ...prev,
              projects: prev.projects.map(p => {
                  if (p.id !== projectId) return p;
                  const routeId = crypto.randomUUID();
                  const routeItems: ItemRota[] = template?.items.map(ti => {
                    const globalProduct = prev.products.find(prod => prod.code === ti.code);
                    const currentPrice = globalProduct ? globalProduct.value : 0;
                    return {
                        id: crypto.randomUUID(),
                        projectRouteId: routeId,
                        code: ti.code,
                        name: ti.name,
                        quantity: ti.quantity,
                        value: currentPrice, 
                        totalCalculado: ti.quantity * currentPrice
                    };
                  }) || [];
                  const newRoute: ProjectRoute = {
                      id: routeId,
                      projectId: projectId,
                      name: routeName,
                      items: routeItems
                  };
                  return { ...p, routes: [...p.routes, newRoute] };
              })
          };
      });
  };

  const removeRouteFromProject = (projectId: string, routeId: string) => {
      setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
              if (p.id !== projectId) return p;
              return { ...p, routes: p.routes.filter(r => r.id !== routeId) };
          })
      }));
  };

  const updateRouteName = (projectId: string, routeId: string, name: string) => {
    setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                routes: p.routes.map(r => r.id === routeId ? { ...r, name } : r)
            };
        })
    }));
  };

  const addItemToRoute = (projectId: string, routeId: string, itemRaw: Omit<ItemRota, 'id' | 'totalCalculado' | 'projectRouteId'>) => {
    setState(prev => {
      const projects = prev.projects.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          routes: proj.routes.map(route => {
            if (route.id !== routeId) return route;
            const newItem: ItemRota = {
              ...itemRaw,
              id: crypto.randomUUID(),
              projectRouteId: routeId,
              totalCalculado: itemRaw.quantity * itemRaw.value
            };
            return { ...route, items: [...route.items, newItem] };
          })
        };
      });
      return { ...prev, projects };
    });
  };

  const updateItemInRoute = (projectId: string, routeId: string, itemId: string, updates: Partial<ItemRota>) => {
    setState(prev => {
      return {
        ...prev,
        projects: prev.projects.map(proj => {
          if (proj.id !== projectId) return proj;
          return {
            ...proj,
            routes: proj.routes.map(route => {
              if (route.id !== routeId) return route;
              return {
                ...route,
                items: route.items.map(item => {
                  if (item.id !== itemId) return item;
                  const updatedItem = { ...item, ...updates };
                  updatedItem.totalCalculado = updatedItem.quantity * updatedItem.value;
                  return updatedItem;
                })
              };
            })
          };
        })
      };
    });
  };

  const removeItemFromRoute = (projectId: string, routeId: string, itemId: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          routes: proj.routes.map(route => {
            if (route.id !== routeId) return route;
            return {
              ...route,
              items: route.items.filter(i => i.id !== itemId)
            };
          })
        };
      })
    }));
  };
  
  const updateConfig = (percentage: number) => {
      setState(prev => ({ ...prev, config: { ...prev.config, equipmentPercentage: percentage }}));
  }

  if (isLoading) {
      return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400">Carregando dados...</div>;
  }

  return (
    <AppContext.Provider value={{
      state,
      isLoading,
      saveStatus,
      addProduct,
      updateProduct,
      deleteProduct,
      importProducts,
      clearProducts,
      addRouteTemplate,
      updateRouteTemplate,
      deleteRouteTemplate,
      importRouteTemplates,
      addProject,
      updateProjectName,
      deleteProject,
      addRouteToProject,
      removeRouteFromProject,
      updateRouteName,
      addItemToRoute,
      updateItemInRoute,
      removeItemFromRoute,
      updateConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};