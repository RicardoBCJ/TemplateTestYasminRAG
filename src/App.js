// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Upload, RefreshCw, Trash2, Send, List } from 'lucide-react';

const PYTHON_BASE_URL = 'http://localhost:5001';

const RAGInterface = () => {
  const [state, setState] = useState({
    documents: [],
    models: [],
    selectedModel: '',
    documentType: '',
    uploadStatus: '',
    errorMessage: '',
    isLoading: false,
    chatMode: 'full' // 'dut' ou 'full'
  });

  const [chat, setChat] = useState({
    input: '',
    response: '',
    history: [],
    isProcessing: false
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  // Função para buscar documentos
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${PYTHON_BASE_URL}/documents`);
      if (!response.ok) {
        throw new Error(`API respondeu com status ${response.status}`);
      }
      const data = await response.json();
      setState(prev => ({ ...prev, documents: data.documents, errorMessage: '' }));
    } catch (error) {
      setState(prev => ({ ...prev, errorMessage: `Erro ao buscar documentos: ${error.message}` }));
    }
  }, []);

  // Função para buscar modelos
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch(`${PYTHON_BASE_URL}/models`);
      
      if (!response.ok) {
        throw new Error(`API respondeu com status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verifica se 'models' é um array
      const models = Array.isArray(data.models) ? data.models : [];
      
      setState(prev => ({ 
        ...prev, 
        models: models,
        selectedModel: models[0]?.name || ''
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errorMessage: `Erro ao buscar modelos: ${error.message}`,
        models: [],
        selectedModel: ''
      }));
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchModels();
  }, [fetchDocuments, fetchModels]);

  // Função para ler o conteúdo do arquivo
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
      reader.readAsText(file);
    });
  };

  // Função para fazer upload de arquivos
  const handleFileUpload = async () => {
    if (!selectedFiles.length || !state.documentType) {
      setState(prev => ({ ...prev, errorMessage: 'Por favor, selecione arquivos e o tipo de documento' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, uploadStatus: 'Carregando...', errorMessage: '' }));

    try {
      for (const file of selectedFiles) {
        const content = await readFileContent(file);
        await fetch(`${PYTHON_BASE_URL}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content,
            doc_type: state.documentType 
          }),
        });
      }
      setState(prev => ({ 
        ...prev, 
        uploadStatus: 'Upload realizado com sucesso',
        errorMessage: '' 
      }));
      fetchDocuments();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errorMessage: `Upload falhou: ${error.message}`,
        uploadStatus: 'Upload falhou' 
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      setSelectedFiles([]);
    }
  };

  // Função para deletar um documento
  const handleDeleteDocument = async (docId) => {
    const confirmDelete = window.confirm("Tem certeza que deseja deletar este documento?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${PYTHON_BASE_URL}/documents/${docId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`API respondeu com status ${response.status}`);
      }
      setState(prev => ({ 
        ...prev, 
        uploadStatus: `Documento ${docId} deletado`,
        errorMessage: ''
      }));
      fetchDocuments();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errorMessage: `Falha ao deletar: ${error.message}` 
      }));
    }
  };

  // Função para tratar consultas de chat
  const handleQuery = async () => {
    if (!chat.input.trim()) return;

    setChat(prev => ({ ...prev, isProcessing: true }));
    try {
      // Determina o endpoint com base no modo de chat
      const endpoint = state.chatMode === 'dut' ? '/query/dut' : '/query/full';

      const response = await fetch(`${PYTHON_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chat.input }),
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status ${response.status}`);
      }

      const data = await response.json();

      // Verifica se 'result' existe na resposta
      const result = data.result || "Nenhuma resposta disponível.";

      setChat(prev => ({
        ...prev,
        response: result,
        history: [...prev.history, { 
          question: prev.input, 
          answer: result 
        }],
        input: ''
      }));
    } catch (error) {
      setChat(prev => ({ 
        ...prev, 
        response: `Erro: ${error.message}` 
      }));
    } finally {
      setChat(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Seção de Upload de Documentos */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upload de Documentos</h2>
          {state.isLoading && <Loader2 className="animate-spin" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select 
            value={state.documentType}
            onChange={(e) => setState(prev => ({ ...prev, documentType: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="">Selecione o Tipo de Documento</option>
            <option value="DUT">Diretrizes DUT</option>
            <option value="REPORT">Relatórios de Exemplo</option>
            <option value="OTHER">Outros Documentos</option>
          </select>

          <select
            value={state.selectedModel}
            onChange={(e) => setState(prev => ({ ...prev, selectedModel: e.target.value }))}
            className="w-full p-2 border rounded"
            disabled={state.models.length === 0}
          >
            <option value="">Selecione o Modelo</option>
            {state.models.map((model, index) => (
              <option key={index} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {state.models.length === 0 && (
          <p className="text-red-500 mt-2">Nenhum modelo disponível. Certifique-se de que os modelos estão carregados no servidor.</p>
        )}

        <div className="mb-4">
          <input
            type="file"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
                     file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 
                     hover:file:bg-blue-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFileUpload}
            disabled={state.isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md 
                     hover:bg-blue-600 disabled:bg-gray-400"
          >
            <Upload size={16} />
            {state.isLoading ? 'Carregando...' : 'Upload'}
          </button>
          
          <button
            onClick={fetchDocuments}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md 
                     hover:bg-gray-600"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        {(state.uploadStatus || state.errorMessage) && (
          <div className={`mt-4 p-4 rounded-md ${state.errorMessage ? 'bg-red-50' : 'bg-green-50'}`}>
            <p>{state.errorMessage || state.uploadStatus}</p>
          </div>
        )}
      </div>

      {/* Seção de Lista de Documentos */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Documentos Carregados</h2>
          <List size={20} />
        </div>
        
        <div className="space-y-2">
          {state.documents.length > 0 ? (
            state.documents.map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-semibold">{doc.name || doc.id}</span>
                  <span className="ml-2 text-sm text-gray-500">({doc.metadata.doc_type})</span>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p>Nenhum documento carregado ainda.</p>
          )}
        </div>
      </div>

      {/* Seção de Chat */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Interface de Consulta RAG</h2>

        {/* Seleção de Modo de Chat */}
        <div className="flex items-center mb-4">
          <label htmlFor="chatMode" className="mr-2 font-semibold">Modo de Chat:</label>
          <select
            id="chatMode"
            value={state.chatMode}
            onChange={(e) => setState(prev => ({ ...prev, chatMode: e.target.value }))}
            className="p-2 border rounded"
          >
            <option value="dut">DUT Apenas</option>
            <option value="full">DUT + Outros Documentos</option>
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
          {chat.history.map((item, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold">Q: {item.question}</p>
              <p className="ml-4">A: {item.answer}</p>
            </div>
          ))}
          {chat.isProcessing && (
            <div className="flex justify-center">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <textarea
            value={chat.input}
            onChange={(e) => setChat(prev => ({ ...prev, input: e.target.value }))}
            placeholder="Digite sua pergunta..."
            className="flex-1 p-2 border rounded-md resize-none"
            rows={3}
          />
          <button
            onClick={handleQuery}
            disabled={chat.isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md 
                     hover:bg-blue-600 disabled:bg-gray-400"
          >
            <Send size={16} />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RAGInterface;
