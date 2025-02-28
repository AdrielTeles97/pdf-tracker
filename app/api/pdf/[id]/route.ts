// app/api/pdf/[id]/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided');
}
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'ID do documento é obrigatório' }, { status: 400 });
        }

        // Buscar informações do documento
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('tracking_id', id)
            .single();

        if (error || !document) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
        }

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
        const trackingUrlText = 'Clique aqui para verificar a versão mais recente deste documento';
        page.drawText(trackingUrlText, {
            x: 50,
            y: 100,
            size: 10,
            font,
            color: rgb(0, 0, 1),
        });

        // Rodapé
        page.drawText(`ID de Rastreamento: ${document.tracking_id}`, {
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