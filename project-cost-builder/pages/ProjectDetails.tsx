import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, FileSpreadsheet, ChevronRight, Calculator, Table, Pencil, Check, X, Plus, Trash2, Search } from 'lucide-react';
import { exportProjectToExcel, exportRouteToExcel, exportProjectExplodedToExcel } from '../services/excelService';

const AddRouteModal: React.FC<{ onClose: () => void, projectId: string }> = ({ onClose, projectId }) => {
    const { state, addRouteToProject } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [customName, setCustomName] = useState('');
    
    const filteredTemplates = state.routeTemplates.filter(rt => 
        rt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddTemplate = (templateId: string) => {
        addRouteToProject(projectId, templateId);
        onClose();
    };

    const handleAddCustom = () => {
        if (!customName.trim()) return;
        addRouteToProject(projectId, null, customName);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Adicionar Rota ao Projeto</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Opção 1: Selecionar Modelo</h4>
                    <div className="relative mb-2">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input 
                            className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                            placeholder="Buscar modelo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded divide-y">
                        {filteredTemplates.map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => handleAddTemplate(t.id)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex justify-between items-center"
                            >
                                {t.name}
                                <Plus size={14} className="text-slate-400" />
                            </button>
                        ))}
                        {filteredTemplates.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400">Nenhum modelo encontrado.</div>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Opção 2: Rota em Branco</h4>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                            placeholder="Nome da nova rota (ex: Acabamento)"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                        />
                        <button 
                            onClick={handleAddCustom}
                            disabled={!customName.trim()}
                            className="bg-accent text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                        >
                            Criar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetails: React.FC = () => {
  const { id } = useParams() as { id: string };
  const { state, updateProjectName, updateRouteName, removeRouteFromProject } = useApp();
  const { confirm } = useUI();
  const navigate = useNavigate();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editRouteName, setEditRouteName] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const project = state.projects.find(p => p.id === id);

  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  const grandTotal = project.routes.reduce((acc, r) => {
    return acc + r.items.reduce((iAcc, i) => iAcc + i.totalCalculado, 0);
  }, 0);

  const equipmentTotal = grandTotal * (state.config.equipmentPercentage / 100);

  // Project Title Edit Logic
  const startEditTitle = () => {
      setEditTitle(project.name);
      setIsEditingTitle(true);
  };
  const saveTitle = () => {
      if(editTitle.trim()) {
          updateProjectName(project.id, editTitle);
      }
      setIsEditingTitle(false);
  };

  // Route Name Edit Logic
  const startEditRoute = (rId: string, currentName: string) => {
      setEditRouteName(currentName);
      setEditingRouteId(rId);
  };
  const saveRoute = (rId: string) => {
      if(editRouteName.trim()) {
          updateRouteName(project.id, rId, editRouteName);
      }
      setEditingRouteId(null);
  };

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
      const isConfirmed = await confirm({
          title: "Excluir Rota",
          message: `Tem certeza que deseja remover a rota "${routeName}" deste projeto?`
      });
      if (isConfirmed) {
          removeRouteFromProject(project.id, routeId);
      }
  };

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Link to="/projects" className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <ArrowLeft size={24} />
          </Link>
          
          <div className="flex-1">
             {!isEditingTitle ? (
                 <div className="flex items-center gap-2 group">
                     <h2 className="text-2xl font-bold text-slate-800">{project.name}</h2>
                     <button onClick={startEditTitle} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Pencil size={18} />
                     </button>
                 </div>
             ) : (
                 <div className="flex items-center gap-2">
                     <input 
                        className="text-2xl font-bold text-slate-800 border-b-2 border-accent focus:outline-none bg-transparent"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                     />
                     <button onClick={saveTitle} className="text-green-600 hover:bg-green-100 p-1 rounded"><Check size={20} /></button>
                     <button onClick={() => setIsEditingTitle(false)} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={20} /></button>
                 </div>
             )}
             <p className="text-sm text-slate-500">Detalhe do Projeto</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-blue-600 shadow-sm text-sm font-medium"
            >
              <Plus size={18} /> Adicionar Rota
            </button>
            <button 
              onClick={() => exportProjectExplodedToExcel(project)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 shadow-sm text-sm font-medium"
            >
              <Table size={18} /> Planilha Explodida
            </button>
            <button 
              onClick={() => exportProjectToExcel(project, state.config.equipmentPercentage)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm text-sm font-medium"
            >
              <FileSpreadsheet size={18} /> Exportar Completo
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-3 grid grid-cols-1 gap-4">
          {project.routes.map(route => {
            const routeTotal = route.items.reduce((a, b) => a + b.totalCalculado, 0);
            const isEditingThis = editingRouteId === route.id;

            return (
              <div key={route.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-blue-100 text-blue-700 p-2 rounded">
                    <ChevronRight size={20} />
                  </div>
                  <div className="flex-1">
                    {!isEditingThis ? (
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-700">{route.name}</h4>
                            <button 
                                onClick={() => startEditRoute(route.id, route.name)} 
                                className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                             <input 
                                className="font-bold text-slate-700 border-b border-accent focus:outline-none bg-transparent"
                                value={editRouteName}
                                onChange={e => setEditRouteName(e.target.value)}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                             />
                             <button onClick={() => saveRoute(route.id)} className="text-green-600"><Check size={16} /></button>
                             <button onClick={() => setEditingRouteId(null)} className="text-red-500"><X size={16} /></button>
                        </div>
                    )}
                    <p className="text-xs text-slate-400">{route.items.length} itens</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className="font-mono font-medium text-slate-700">R$ {routeTotal.toFixed(2)}</span>
                  <div className="flex gap-2 items-center">
                     <button 
                      onClick={() => exportRouteToExcel(project, route)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Exportar apenas esta rota"
                    >
                      <FileSpreadsheet size={18} />
                    </button>
                    <button 
                        onClick={() => handleDeleteRoute(route.id, route.name)}
                        className="p-2 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir Rota"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/projects/${project.id}/route/${route.id}`)}
                      className="px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 ml-2"
                    >
                      Abrir Rota
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {project.routes.length === 0 && (
             <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500">
                 Este projeto não possui rotas. Adicione uma rota para começar.
             </div>
          )}
        </div>

        {/* Totais Sticky/Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-accent" /> Resumo
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b pb-2">
                <span className="text-sm text-slate-500">Total Geral</span>
                <span className="text-xl font-bold text-slate-800">R$ {grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-end pb-2">
                <span className="text-sm text-slate-500">
                  {state.config.equipmentPercentage}% do Equip.
                </span>
                <span className="text-lg font-medium text-blue-600">R$ {equipmentTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 text-xs text-slate-400 text-center">
              Os valores são calculados automaticamente com base nos itens das rotas.
            </div>
          </div>
        </div>
      </div>
      
      {isAddModalOpen && <AddRouteModal onClose={() => setIsAddModalOpen(false)} projectId={project.id} />}
    </div>
  );
};

export default ProjectDetails;