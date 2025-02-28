// app/generate/page.jsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Vercel deployment URL
const BASE_URL = 'https://pdf-tracker-navy.vercel.app';

export default function GeneratePage() {
    const [recipient, setRecipient] = useState('');
    const [email, setEmail] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Registrar o documento no Supabase
            const { data, error } = await supabase
                .from('documents')
                .insert({
                    title: title,
                    recipient_name: recipient,
                    recipient_email: email,
                })
                .select()
                .single();

            if (error) throw error;

            // Simulando a geração do PDF
            // Em um caso real, você chamaria uma API para gerar o PDF
            setTimeout(() => {
                setResult({
                    tracking_id: data.tracking_id,
                    title: data.title,
                    tracking_url: `${BASE_URL}/api/track/${data.tracking_id}`,
                    download_url: `${BASE_URL}/api/pdf/${data.tracking_id}`
                });
                setLoading(false);
            }, 1500);

        } catch (err) {
            console.error('Erro:', err);
            setError('Ocorreu um erro ao gerar o documento.');
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Gerar PDF Rastreável</h1>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Informações do Documento</h2>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                                Título do Documento
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Ex: Relatório Mensal"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="recipient">
                                Nome do Destinatário
                            </label>
                            <input
                                type="text"
                                id="recipient"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                                Email do Destinatário
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Ex: joao@exemplo.com"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Gerando...
                                    </span>
                                ) : 'Gerar PDF'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Erro! </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                            <h3 className="font-bold text-lg mb-2">PDF Gerado com Sucesso!</h3>
                            <p className="mb-1"><strong>Título:</strong> {result.title}</p>
                            <p className="mb-1"><strong>ID de Rastreamento:</strong> {result.tracking_id}</p>

                            <div className="mt-4 flex space-x-4">
                                <a
                                    href={result.download_url}
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-flex items-center"
                                    download
                                >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
                                    </svg>
                                    Baixar PDF
                                </a>

                                <a
                                    href={result.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline inline-flex items-center"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.26 13a2 2 0 0 1 .01-2.01A3 3 0 0 0 9 5H5a3 3 0 0 0 0 6h.08a6.06 6.06 0 0 0 0 2H5A5 5 0 0 1 5 3h4a5 5 0 0 1 .26 10zm1.48-6a2 2 0 0 1-.01 2.01A3 3 0 0 0 11 15h4a3 3 0 0 0 0-6h-.08a6.06 6.06 0 0 0 0-2H15a5 5 0 0 1 0 10h-4a5 5 0 0 1-.26-10z" />
                                    </svg>
                                    Link de Rastreamento
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}