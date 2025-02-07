import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Upload, RefreshCw, Trash2, Send, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Disclosure } from '@headlessui/react';

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
    chatMode: 'full',
    darkMode: true
  });

  const [chat, setChat] = useState({
    input: '',
    response: '',
    history: [],
    isProcessing: false,
    textareaRows: 1
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

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

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
        uploadStatus: 'Erro no upload'
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

    <div className={`min-h-screen w-full ${state.darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col min-h-screen p-4 max-w-6xl mx-auto transition-colors duration-300">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setState(prev => ({ ...prev, darkMode: !prev.darkMode }))}
            className={`p-2 rounded-full ${state.darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
          >
            {state.darkMode ? '🌞' : '🌙'}
          </button>
        </div>

        {(state.errorMessage || state.uploadStatus) && (
          <div className={`mt-4 p-4 rounded-md ${state.errorMessage ?
              (state.darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700') :
              (state.darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700')
            }`}>
            <p className="font-semibold">
              {state.errorMessage ? 'Erro:' : 'Status:'}
            </p>
            <p>{state.errorMessage || state.uploadStatus}</p>
          </div>
        )}

        {/* Upload Section */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${state.darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Upload de Documentos</h2>
            {state.isLoading && <Loader2 className="animate-spin" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={state.documentType}
              onChange={(e) => setState(prev => ({ ...prev, documentType: e.target.value }))}
              className={`w-full p-2 rounded ${state.darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
            >
              <option value="">Selecione o Tipo de Documento</option>
              <option value="DUT">Diretrizes DUT</option>
              <option value="DUT_MANUAL">Manual de Interpretação DUT</option>
              <option value="REPORT">Relatórios de Exemplo</option>
              <option value="OTHER">Outros Documentos</option>
            </select>

            <select
              value={state.selectedModel}
              onChange={(e) => setState(prev => ({ ...prev, selectedModel: e.target.value }))}
              className={`w-full p-2 rounded ${state.darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'}`}
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
            <p className={`mt-2 ${state.darkMode ? 'text-red-400' : 'text-red-500'}`}>
              Nenhum modelo disponível. Certifique-se de que os modelos estão carregados no servidor.
            </p>
          )}

          <div className="mb-4">
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className={`w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
                      ${state.darkMode ?
                  'file:bg-blue-900 file:text-blue-200 hover:file:bg-blue-800' :
                  'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}`}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFileUpload}
              disabled={state.isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                      ${state.darkMode ?
                  'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700' :
                  'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'}`}
            >
              <Upload size={16} />
              {state.isLoading ? 'Carregando...' : 'Upload'}
            </button>

            <button
              onClick={fetchDocuments}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                      ${state.darkMode ?
                  'bg-gray-700 hover:bg-gray-600' :
                  'bg-gray-200 hover:bg-gray-300'}`}
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>

          {(state.uploadStatus || state.errorMessage) && (
            <div className={`mt-4 p-4 rounded-md ${state.errorMessage ?
              (state.darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700') :
              (state.darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700')}`}>
              <p>{state.errorMessage || state.uploadStatus}</p>
            </div>
          )}
        </div>

        {/* Collapsible Documents Section */}
        <Disclosure>
          {({ open }) => (
            <div className={`rounded-lg shadow-lg p-6 mb-6 ${state.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <Disclosure.Button className="flex w-full justify-between items-center">
                <h2 className="text-xl font-bold">Documentos Carregados</h2>
                {open ? (
                  <ChevronUp className={`h-5 w-5 ${state.darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 ${state.darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                )}
              </Disclosure.Button>

              <Disclosure.Panel className="mt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.documents.length > 0 ? (
                    state.documents.map(doc => (
                      <div key={doc.id} className={`flex justify-between items-center p-3 rounded-lg ${state.darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="truncate">
                          <span className="font-semibold truncate">
                            {doc.metadata?.name || `Document-${doc.id.slice(0, 6)}`}
                          </span>
                          <span className={`ml-2 text-sm ${state.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            ({doc.metadata?.doc_type || 'Unknown'})
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className={`hover:text-red-500 transition-colors ${state.darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center ${state.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Nenhum documento carregado ainda.
                    </p>
                  )}
                </div>
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>

        {/* Chat Section */}
        <div className={`rounded-lg shadow-lg p-6 ${state.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Interface de Consulta RAG</h2>
            <select
              value={state.chatMode}
              onChange={(e) => setState(prev => ({ ...prev, chatMode: e.target.value }))}
              className={`p-2 rounded-md ${state.darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            >
              <option value="dut">DUT Apenas</option>
              <option value="full">DUT + Outros Documentos</option>
            </select>
          </div>

          {/* Chat History */}
          <div className={`rounded-lg p-4 mb-4 h-96 overflow-y-auto ${state.darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            {chat.history.map((item, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <div className={`p-3 rounded-lg ${state.darkMode ? 'bg-gray-600' : 'bg-white shadow-sm'}`}>
                  <p className="font-semibold text-blue-400">Q: {item.question}</p>
                  <div className={`mt-2 p-2 rounded ${state.darkMode ? 'bg-gray-500/20' : 'bg-blue-50'}`}>
                    <p className="whitespace-pre-wrap">A: {item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
            {chat.isProcessing && (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-blue-400" />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 items-end">
            <textarea
              value={chat.input}
              onChange={(e) => {
                const rows = Math.min(Math.max(e.target.value.split('\n').length, 1), 5);
                setChat(prev => ({
                  ...prev,
                  input: e.target.value,
                  textareaRows: rows
                }));
              }}
              rows={chat.textareaRows}
              placeholder="Digite sua pergunta..."
              className={`flex-1 p-3 rounded-lg resize-none transition-all ${state.darkMode
                ? 'bg-gray-700 border-gray-600 focus:border-blue-400 focus:ring-blue-500'
                : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
            />
            <button
              onClick={handleQuery}
              disabled={chat.isProcessing}
              className={`p-3 h-min rounded-lg flex items-center gap-2 transition-colors ${state.darkMode
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300'
                }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAGInterface;

