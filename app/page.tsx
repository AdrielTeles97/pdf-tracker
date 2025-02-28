// app/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Crie um cliente Supabase para o lado do cliente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [accesses, setAccesses] = useState([]);

  // Carregar lista de documentos
  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('document_access_summary')
          .select('*');

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Erro ao carregar documentos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();

    // Configurar atualização em tempo real (opcional)
    const subscription = supabase
      .channel('public:documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, fetchDocuments)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar acessos para um documento específico
  async function loadDocumentAccesses(trackingId) {
    try {
      setSelectedDocument(trackingId);

      const { data, error } = await supabase
        .from('document_accesses')
        .select('*')
        .eq('document_id', trackingId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setAccesses(data || []);
    } catch (error) {
      console.error('Erro ao carregar acessos:', error);
    }
  }

  // Formatar data
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard de Rastreamento de PDFs</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Documentos ({documents.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatário</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acessos</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último acesso</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum documento encontrado
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.tracking_id} className={selectedDocument === doc.tracking_id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.recipient_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.access_count || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.last_access)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => loadDocumentAccesses(doc.tracking_id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDocument && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Detalhes de Acesso</h2>
          </div>

          {accesses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum acesso registrado para este documento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accesses.map((access) => (
                    <tr key={access.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(access.timestamp)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{access.ip_address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {access.city && access.country
                          ? `${access.city}, ${access.country}`
                          : 'Desconhecido'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={access.user_agent}>
                        {access.user_agent
                          ? access.user_agent.substring(0, 50) + (access.user_agent.length > 50 ? '...' : '')
                          : 'Desconhecido'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}