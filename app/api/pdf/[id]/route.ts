import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

        // Conteúdo
        page.drawText('Este documento contém informações importantes.', {
            x: 50,
            y: height - 160,
            size: 11,
            font,
            color: rgb(0, 0, 0),
        });

        page.drawText('Por favor, leia com atenção.', {
            x: 50,
            y: height - 180,
            size: 11,
            font,
            color: rgb(0, 0, 0),
        });

        // Link de rastreamento (texto)
        const trackingUrlText = `Link de Rastreamento: https://pdf-tracker-navy.vercel.app/api/track/${id}`;
        page.drawText(trackingUrlText, {
            x: 50,
            y: 100,
            size: 10,
            font,
            color: rgb(0, 0, 1),
        });

        // Rodapé
        page.drawText(`ID de Rastreamento: ${id}`, {
            x: 50,
            y: 50,
            size: 8,
            font,
            color: rgb(0.5, 0.5, 0.5),
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