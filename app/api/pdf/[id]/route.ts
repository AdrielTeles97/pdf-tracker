import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Função para gerar CPF no formato 000.000.000-00
function generateCPF() {
    // Gera números base
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9);
    const n3 = Math.floor(Math.random() * 9);
    const n4 = Math.floor(Math.random() * 9);
    const n5 = Math.floor(Math.random() * 9);
    const n6 = Math.floor(Math.random() * 9);
    const n7 = Math.floor(Math.random() * 9);
    const n8 = Math.floor(Math.random() * 9);
    const n9 = Math.floor(Math.random() * 9);

    // Calcula dígitos verificadores
    let d1 = n9*10 + n8*9 + n7*8 + n6*7 + n5*6 + n4*5 + n3*4 + n2*3 + n1*2;
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;

    let d2 = d1*10 + n9*9 + n8*8 + n7*7 + n6*6 + n5*5 + n4*4 + n3*3 + n2*2 + n1*1;
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;

    // Formata o CPF
    return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
}

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided');
}
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
    request: NextRequest, 
    { params }: { params: { id: string } }
) {
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
        page.drawText(`Valor: R$ 260,00`, {
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

        const cpf = generateCPF();
        page.drawText(`CPF/CNPJ: ${cpf}`, {
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