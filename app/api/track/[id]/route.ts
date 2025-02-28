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
    // Lista de possíveis cabeçalhos de IP
    const ipHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip',
        'x-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
    ];

    // Tenta obter o IP de diferentes cabeçalhos
    for (const header of ipHeaders) {
        const value = request.headers.get(header);
        if (value) {
            // Se for uma lista de IPs, pega o primeiro
            return value.split(',')[0].trim();
        }
    }

    // Fallback para localhost se nenhum IP for encontrado
    return '127.0.0.1';
}

// Função para obter informações de localização
async function getLocationInfo(ip: string) {
    // Se for IP localhost, retorna informações padrão
    if (ip === '127.0.0.1') {
        return {
            country: 'Desconhecido',
            city: 'Localhost',
            latitude: null,
            longitude: null
        };
    }

    try {
        // Tenta primeiro o ipapi.co
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { 
            headers: {
                'User-Agent': 'PDFTracker/1.0'
            }
        });

        if (!response.ok) {
            // Se falhar, tenta um serviço alternativo
            const backupResponse = await fetch(`https://ip-api.com/json/${ip}`);
            if (!backupResponse.ok) {
                throw new Error('Falha na obtenção de localização');
            }
            const backupData = await backupResponse.json();
            return {
                country: backupData.country || 'Desconhecido',
                city: backupData.city || 'Não identificada',
                latitude: backupData.lat || null,
                longitude: backupData.lon || null
            };
        }

        const data = await response.json();
        return {
            country: data.country_name || 'Desconhecido',
            city: data.city || 'Não identificada',
            latitude: data.latitude || null,
            longitude: data.longitude || null
        };
    } catch (error) {
        console.error('Erro ao obter localização:', error);
        return {
            country: 'Desconhecido',
            city: 'Não identificada',
            latitude: null,
            longitude: null
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
                city: locationInfo.city,
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
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
        </head>
        <body class="bg-gray-100 min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <h1 class="text-2xl font-bold mb-4 text-center">Rastreamento de Documento</h1>
                
                <div class="space-y-4">
                    <div class="bg-gray-50 p-4 rounded">
                        <h2 class="font-semibold">Informações do Documento</h2>
                        <p><strong>Título:</strong> ${document.title}</p>
                        <p><strong>Destinatário:</strong> ${document.recipient_name}</p>
                    </div>
                    
                    <div class="bg-blue-50 p-4 rounded">
                        <h2 class="font-semibold text-blue-800">Status</h2>
                        <p class="text-blue-600">Documento visualizado e rastreado</p>
                    </div>

                    <div class="bg-green-50 p-4 rounded">
                        <h2 class="font-semibold text-green-800">Localização</h2>
                        <p class="text-green-600">${locationInfo.city}, ${locationInfo.country}</p>
                    </div>
                </div>
                
                <div class="mt-6 text-center text-gray-500 text-sm">
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