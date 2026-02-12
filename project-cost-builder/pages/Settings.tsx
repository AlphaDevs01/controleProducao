import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { state, updateConfig } = useApp();
  const { showToast } = useUI();
  const [percent, setPercent] = useState(state.config.equipmentPercentage);

  const handleSaveConfig = () => {
    updateConfig(percent);
    showToast('Configurações salvas com sucesso!', 'success');
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Configurações do Sistema</h2>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-700">Cálculos Globais</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Percentual do Equipamento (%)</label>
          <p className="text-xs text-slate-500 mb-2">Usado para calcular a margem ou custo de equipamento sobre o total do projeto na tela de detalhes.</p>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              className="w-full border rounded p-2"
              value={percent}
              onChange={e => setPercent(Number(e.target.value))}
            />
            <span className="text-slate-600 font-bold text-lg">%</span>
          </div>
        </div>

        <button 
          onClick={handleSaveConfig}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded hover:bg-emerald-700 w-full justify-center font-medium shadow-sm"
        >
          <Save size={18} /> Salvar Configurações
        </button>
      </div>
    </div>
  );
};

export default Settings;