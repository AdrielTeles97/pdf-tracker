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

// Função para obter informações de localização com mais precisão
async function getLocationInfo(ip: string) {
    if (ip === '127.0.0.1') {
        return {
            country: 'Brasil',
            state: 'Pará',
            city: 'Belém',
            neighborhood: 'Centro',
            latitude: -1.4558,
            longitude: -48.4902
        };
    }

    try {
        // Primeira tentativa com ipapi.co
        const response = await fetch(`https://ipapi.co/${ip}/json/`, { 
            headers: {
                'User-Agent': 'PDFTracker/1.0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                country: data.country_name || 'Brasil',
                state: data.region || 'Pará',
                city: data.city || 'Belém',
                neighborhood: data.org || 'Centro',
                latitude: data.latitude || -1.4558,
                longitude: data.longitude || -48.4902
            };
        }

        // Backup com ip-api.com
        const backupResponse = await fetch(`https://ip-api.com/json/${ip}`);
        if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            return {
                country: backupData.country || 'Brasil',
                state: backupData.regionName || 'Pará',
                city: backupData.city || 'Belém',
                neighborhood: backupData.isp || 'Centro',
                latitude: backupData.lat || -1.4558,
                longitude: backupData.lon || -48.4902
            };
        }

        // Fallback com valores padrão
        return {
            country: 'Brasil',
            state: 'Pará',
            city: 'Belém',
            neighborhood: 'Centro',
            latitude: -1.4558,
            longitude: -48.4902
        };
    } catch (error) {
        console.error('Erro ao obter localização:', error);
        return {
            country: 'Brasil',
            state: 'Pará',
            city: 'Belém',
            neighborhood: 'Centro',
            latitude: -1.4558,
            longitude: -48.4902
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
                neighborhood: locationInfo.neighborhood,
                state: locationInfo.state,
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
        const { height, width } = page.getSize();

        // Cabeçalho do comprovante
        page.drawText('Inter', {
            x: 50,
            y: height - 50,
            size: 24,
            font: boldFont,
            color: rgb(1, 0.4, 0), // Laranja do Inter
        });

        page.drawText('Comprovante de Pix', {
            x: 50,
            y: height - 80,
            size: 16,
            font: boldFont,
            color: rgb(0, 0, 0),
        });

        // Detalhes do PIX
        page.drawText(`Valor: R$ ${document.amount || '260,00'}`, {
            x: 50,
            y: height - 120,
            size: 14,
            font: font,
            color: rgb(0, 0, 0),
        });

        page.drawText(`ID da transação: ${id}`, {
            x: 50,
            y: height - 140,
            size: 12,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
        });

        const currentDate = new Date();
        page.drawText(`Data: ${currentDate.toLocaleDateString('pt-BR')} ${currentDate.toLocaleTimeString('pt-BR')}`, {
            x: 50,
            y: height - 160,
            size: 12,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
        });

        // Dados do recebedor
        page.drawText('Dados de quem recebeu:', {
            x: 50,
            y: height - 200,
            size: 14,
            font: boldFont,
            color: rgb(0, 0, 0),
        });

        page.drawText(`Nome: ${document.recipient_name}`, {
            x: 50,
            y: height - 220,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
        });

        page.drawText(`CPF/CNPJ: ${document.recipient_document || '000.000.000-00'}`, {
            x: 50,
            y: height - 240,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
        });

        page.drawText(`Instituição: Banco Inter S.A.`, {
            x: 50,
            y: height - 260,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
        });

        // Rodapé com localização
        page.drawText(`Localização: ${locationInfo.neighborhood}, ${locationInfo.city} - ${locationInfo.state}, ${locationInfo.country}`, {
            x: 50,
            y: 50,
            size: 10,
            font: font,
            color: rgb(0.6, 0.6, 0.6),
        });

        // Serializar o PDF
        const pdfBytes = await pdfDoc.save();

        // Configurar resposta
        const response = new NextResponse(pdfBytes);

        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `attachment; filename="Comprovante_Pix_${document.recipient_name.replace(/\s+/g, '_')}.pdf"`);

        return response;

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
    }
}