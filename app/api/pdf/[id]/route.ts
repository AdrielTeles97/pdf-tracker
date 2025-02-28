import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

// Função para obter informações de localização
async function getLocationInfo(ip: string) {
    if (ip === '127.0.0.1') {
        return {
            country: 'Desconhecido',
            city: 'Localhost',
            latitude: null,
            longitude: null
        };
    }

    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { 
            headers: {
                'User-Agent': 'PDFTracker/1.0'
            }
        });

        if (!response.ok) {
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

        // Obter informações de localização
        const locationInfo = await getLocationInfo(ip);

        // Buscar informações do documento
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('tracking_id', id)
            .single();

        if (error || !document) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
        }

        // Registrar download
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
                access_type: 'download'
            });

        // Criar PDF usando pdf-lib
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4

        // Carregar fonte
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Definir conteúdo
        const { height } = page.getSize();

        // Título
        page.drawText(document.title, {
            x: 50,
            y: height - 50,
            size: 24,
            font: boldFont,
            color: rgb(0, 0, 0),
        });

        // Informações do destinatário
        page.drawText(`Preparado para: ${document.recipient_name}`, {
            x: 50,
            y: height - 100,
            size: 12,
            font,
            color: rgb(0, 0, 0),
        });

        // Data
        const currentDate = new Date().toLocaleDateString('pt-BR');
        page.drawText(`Data: ${currentDate}`, {
            x: 50,
            y: height - 120,
            size: 12,
            font,
            color: rgb(0, 0, 0),
        });

        // Conteúdo principal do documento (exemplo)
        page.drawText('Conteúdo do documento', {
            x: 50,
            y: height - 160,
            size: 11,
            font,
            color: rgb(0, 0, 0),
        });

        // Serializar o PDF
        const pdfBytes = await pdfDoc.save();

        // Configurar resposta
        const response = new NextResponse(pdfBytes);

        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `attachment; filename="${document.title.replace(/\s+/g, '_')}.pdf"`);

        return response;

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
    }
}