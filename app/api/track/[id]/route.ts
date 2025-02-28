import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para extrair IP do cliente
function extractClientIP(request: NextRequest): string {
    const ipHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip',
        'x-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
    ];

    for (const header of ipHeaders) {
        const value = request.headers.get(header);
        if (value) {
            return value.split(',')[0].trim();
        }
    }

    return '127.0.0.1';
}

// Função para obter informações de localização com mais detalhes
async function getLocationInfo(ip: string) {
    if (ip === '127.0.0.1') {
        return {
            country: 'Desconhecido',
            state: 'Desconhecido',
            city: 'Localhost',
            neighborhood: 'Não identificado',
            latitude: null,
            longitude: null,
            timezone: 'Desconhecido',
            network: 'Desconhecido',
            postal_code: 'Não identificado'
        };
    }

    try {
        // Tenta primeiro o ipapi.co
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { 
            headers: {
                'User-Agent': 'PDFTracker/1.0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                country: data.country_name || 'Desconhecido',
                state: data.region || 'Desconhecido',
                city: data.city || 'Não identificada',
                neighborhood: data.org || 'Não identificado',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || 'Desconhecido',
                network: data.org || 'Desconhecido',
                postal_code: data.postal || 'Não identificado'
            };
        }

        // Backup com ip-api.com
        const backupResponse = await fetch(`https://ip-api.com/json/${ip}`);
        if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            return {
                country: backupData.country || 'Desconhecido',
                state: backupData.regionName || 'Desconhecido',
                city: backupData.city || 'Não identificada',
                neighborhood: backupData.isp || 'Não identificado',
                latitude: backupData.lat || null,
                longitude: backupData.lon || null,
                timezone: backupData.timezone || 'Desconhecido',
                network: backupData.isp || 'Desconhecido',
                postal_code: backupData.zip || 'Não identificado'
            };
        }

        // Fallback
        return {
            country: 'Desconhecido',
            state: 'Desconhecido',
            city: 'Não identificada',
            neighborhood: 'Não identificado',
            latitude: null,
            longitude: null,
            timezone: 'Desconhecido',
            network: 'Desconhecido',
            postal_code: 'Não identificado'
        };
    } catch (error) {
        console.error('Erro ao obter localização:', error);
        return {
            country: 'Desconhecido',
            state: 'Desconhecido',
            city: 'Não identificada',
            neighborhood: 'Não identificado',
            latitude: null,
            longitude: null,
            timezone: 'Desconhecido',
            network: 'Desconhecido',
            postal_code: 'Não identificado'
        };
    }
}

export async function GET(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'ID do documento é obrigatório' }, { status: 400 });
        }

        // Extrair IP do cliente
        const ip = extractClientIP(request);

        // Log para depuração
        console.log('IP extraído:', ip);

        // Obter informações de localização
        const locationInfo = await getLocationInfo(ip);

        // Log para depuração
        console.log('Informações de localização:', locationInfo);

        // Buscar informações do documento
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('tracking_id', id)
            .single();

        if (error || !document) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
        }

        // Registrar acesso
        const { error: logError } = await supabase
            .from('document_access_logs')
            .insert({
                document_id: id,
                ip_address: ip,
                user_agent: request.headers.get('user-agent') || '',
                referrer: request.headers.get('referer') || '',
                country: locationInfo.country,
                state: locationInfo.state,
                city: locationInfo.city,
                neighborhood: locationInfo.neighborhood,
                postal_code: locationInfo.postal_code,
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
                timezone: locationInfo.timezone,
                network: locationInfo.network,
                access_type: 'visualizar'
            });

        // Log de erro de registro
        if (logError) {
            console.error('Erro ao registrar log:', logError);
        }

        // Renderizar página de rastreamento
        return new NextResponse(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Rastreamento de Documento</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/lucide-icons"></script>
        </head>
        <body class="bg-gray-100 min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full space-y-6">
                <h1 class="text-2xl font-bold mb-4 text-center">Rastreamento de Documento</h1>
                
                <div class="bg-gray-50 p-4 rounded">
                    <h2 class="font-semibold mb-2">Informações do Documento</h2>
                    <p><strong>Título:</strong> ${document.title}</p>
                    <p><strong>Destinatário:</strong> ${document.recipient_name}</p>
                </div>
                
                <div class="bg-blue-50 p-4 rounded">
                    <h2 class="font-semibold text-blue-800 mb-2">Status</h2>
                    <p class="text-blue-600">Documento visualizado e rastreado</p>
                </div>

                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="font-semibold text-gray-700 mb-3">Detalhes de Localização</h2>
                    <div class="space-y-3">
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-3 text-blue-500">
                                <path d="M20 10c0 6-8 0-8 0s-8 6-8 0a8 8 0 0 1 16 0Z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <div>
                                <p class="text-sm text-gray-600">Localização</p>
                                <p class="font-medium">${locationInfo.neighborhood}, ${locationInfo.city} - ${locationInfo.state}, ${locationInfo.country}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe mr-3 text-green-500">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="2" x2="22" y1="12" y2="12"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                            <div>
                                <p class="text-sm text-gray-600">Coordenadas</p>
                                <p class="font-medium">Lat: ${locationInfo.latitude?.toFixed(4) || 'N/A'}, Lon: ${locationInfo.longitude?.toFixed(4) || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-network mr-3 text-purple-500">
                                <path d="M9 14l6 0"/>
                                <path d="M9 10l6 0"/>
                                <path d="M12 2a7 7 0 1 0 7 7"/>
                                <path d="M17 14a3 3 0 1 0 0 6l3 -3l-3 -3z"/>
                                <path d="M10 10h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4"/>
                            </svg>
                            <div>
                                <p class="text-sm text-gray-600">Rede</p>
                                <p class="font-medium">${locationInfo.network}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock mr-3 text-orange-500">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <div>
                                <p class="text-sm text-gray-600">Fuso Horário</p>
                                <p class="font-medium">${locationInfo.timezone}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center text-gray-500 text-sm">
                    <p>Documento gerado em: ${new Date(document.created_at).toLocaleString('pt-BR')}</p>
                </div>
            </div>
        </body>
        </html>
        `, {
            headers: {
                'Content-Type': 'text/html',
            }
        });

    } catch (error) {
        console.error('Erro ao processar rastreamento:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}