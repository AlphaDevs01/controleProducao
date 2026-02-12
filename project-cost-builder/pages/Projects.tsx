import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { Plus, Trash, ArrowRight, FileSpreadsheet, Search, X, Table, Pencil, Save } from 'lucide-react';
import { exportProjectToExcel, exportProjectExplodedToExcel } from '../services/excelService';

const Projects: React.FC = () => {
  const { state, addProject, updateProjectName, deleteProject } = useApp();
  const { confirm } = useUI();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{id: string, name: string} | null>(null);

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Excluir Projeto',
      message: `Tem certeza que deseja excluir o projeto "${name}"? Todas as rotas e itens calculados serão perdidos.`
    });
    if (isConfirmed) {
      deleteProject(id);
    }
  };

  const EditModal = () => {
      const [name, setName] = useState(editingProject?.name || '');

      const handleSave = (e: React.FormEvent) => {
          e.preventDefault();
          if (editingProject && name) {
              updateProjectName(editingProject.id, name);
              setEditingProject(null);
          }
      };

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Renomear Projeto</h3>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Novo Nome</label>
                <input 
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-accent outline-none" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingProject(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-blue-600 flex items-center gap-2">
                    <Save size={16} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      );
  };

  const CreateModal = () => {
    const [name, setName] = useState('');
    const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name) return;
      addProject(name, selectedRoutes);
      setIsModalOpen(false);
    };

    const addRoute = (id: string) => {
      setSelectedRoutes([...selectedRoutes, id]);
      setSearchTerm('');
    };

    const removeRoute = (id: string) => {
      setSelectedRoutes(selectedRoutes.filter(rid => rid !== id));
    };

    const filteredTemplates = state.routeTemplates.filter(rt => 
      !selectedRoutes.includes(rt.id) &&
      rt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">
          <h3 className="text-lg font-bold mb-4">Novo Projeto</h3>
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Projeto (ex: CSC15)</label>
              <input 
                className="w-full border rounded p-2 focus:ring-2 focus:ring-accent outline-none" 
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                placeholder="Identificador do projeto"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Rotas do Projeto:</label>
              
              <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">
                {selectedRoutes.map(id => {
                  const r = state.routeTemplates.find(rt => rt.id === id);
                  if (!r) return null;
                  return (
                    <span key={id} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center gap-1 animate-fadeIn">
                      {r.name}
                      <button type="button" onClick={() => removeRoute(id)} className="hover:text-blue-600 rounded-full p-0.5">
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
                {selectedRoutes.length === 0 && (
                  <span className="text-sm text-slate-400 italic py-1">Nenhuma rota adicionada ainda.</span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Search size={16} className="text-slate-400" />
                </div>
                <input 
                   type="text"
                   className="w-full pl-10 pr-4 py-2 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                   placeholder="Pesquisar rota para adicionar (ex: Pintura)..."
                   value={searchTerm}
                   onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                   onFocus={() => setIsDropdownOpen(true)}
                   onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                />
                
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredTemplates.map(rt => (
                      <button
                        key={rt.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 block border-b last:border-0"
                        onClick={() => addRoute(rt.id)}
                      >
                        {rt.name}
                      </button>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <div className="px-4 py-2 text-sm text-slate-400 italic">
                        {searchTerm ? "Nenhuma rota encontrada." : "Todas as rotas disponíveis já foram adicionadas."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-blue-600">Criar Projeto</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Projetos</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-blue-600 font-medium"
        >
          <Plus size={18} /> Criar Projeto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {state.projects.map(proj => {
          const totalValue = proj.routes.reduce((acc, r) => acc + r.items.reduce((iAcc, i) => iAcc + i.totalCalculado, 0), 0);
          
          return (
            <div key={proj.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-800">{proj.name}</h3>
                  <button 
                    onClick={() => setEditingProject({id: proj.id, name: proj.name})}
                    className="text-slate-400 hover:text-blue-600"
                    title="Renomear Projeto"
                  >
                    <Pencil size={16} />
                  </button>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                    {proj.routes.length} rotas
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  Criado em: {new Date(proj.createdAt).toLocaleDateString()}
                </p>
                <p className="text-emerald-600 font-semibold mt-2">
                  Total: R$ {totalValue.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportProjectExplodedToExcel(proj)}
                  className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded"
                  title="Exportar Lista Explodida (Geral)"
                >
                  <Table size={20} />
                </button>
                <button 
                  onClick={() => exportProjectToExcel(proj, state.config.equipmentPercentage)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded"
                  title="Exportar Projeto Completo (Abas)"
                >
                  <FileSpreadsheet size={20} />
                </button>
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                <button 
                  onClick={() => handleDelete(proj.id, proj.name)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash size={18} />
                </button>
                <button 
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm font-medium"
                >
                  Abrir <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
        
        {state.projects.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded border border-dashed border-slate-300 text-slate-500">
            Nenhum projeto encontrado. Crie um novo para começar.
          </div>
        )}
      </div>

      {isModalOpen && <CreateModal />}
      {editingProject && <EditModal />}
    </div>
  );
};

export default Projects;