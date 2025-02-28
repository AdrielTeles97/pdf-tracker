import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import geoip from 'geoip-lite';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para obter informações de localização
function getLocationInfo(ip: string) {
    const geo = geoip.lookup(ip);
    return geo ? {
        country: geo.country,
        city: geo.city,
        latitude: geo.ll[0],
        longitude: geo.ll[1]
    } : {
        country: null,
        city: null,
        latitude: null,
        longitude: null
    };
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

        // Obter IP do cliente
        const ip =
            request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1';

        // Obter informações de localização
        const locationInfo = getLocationInfo(ip);

        // Registrar acesso
        await supabase
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
                access_type: 'view'
            });

        // Buscar informações do documento
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('tracking_id', id)
            .single();

        if (error || !document) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
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