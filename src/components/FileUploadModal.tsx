import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, Upload, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadModalProps {
  title: string;
  endpoint: string;
  templateFields: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  title,
  endpoint,
  templateFields,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Preview file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          if (data) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            setPreviewData(jsonData.slice(0, 3)); // Preview first 3 rows
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          toast.error('Não foi possível ler o arquivo. Verifique o formato.');
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Create workbook with template fields
      const worksheet = XLSX.utils.json_to_sheet([
        templateFields.reduce((acc, field) => ({ ...acc, [field]: '' }), {})
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      // Generate and download file
      XLSX.writeFile(workbook, 'import_template.xlsx');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Falha ao criar modelo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Selecione um arquivo para importar');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Arquivo importado com sucesso');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Falha ao importar arquivo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Importar arquivo Excel ou CSV
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
              <div className="space-y-1 text-center">
                {file ? (
                  <div>
                    <FileText className="mx-auto h-12 w-12 text-green-500" />
                    <p className="text-sm text-gray-700 mt-2">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Selecionar arquivo</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">ou arraste aqui</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Apenas arquivos Excel ou CSV
                    </p>
                  </>
                )}
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-500"
            >
              <Download size={16} className="mr-1" />
              Baixar modelo
            </button>
          </div>
          
          {previewData.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pré-visualização:</h3>
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th
                          key={key}
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td
                            key={i}
                            className="px-3 py-2 whitespace-nowrap text-xs text-gray-500"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Exibindo {previewData.length} linha(s)
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className={`px-4 py-2 rounded-md text-white flex items-center ${
                !file || loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importando...
                </>
              ) : (
                'Importar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileUploadModal;