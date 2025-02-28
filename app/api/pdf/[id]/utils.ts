// Função para gerar CPF no formato ***.***.***-**
function generateMaskedCPF() {
    // Gera números aleatórios para CPF
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9);
    const n3 = Math.floor(Math.random() * 9);
    const n4 = Math.floor(Math.random() * 9);
    const n5 = Math.floor(Math.random() * 9);
    const n6 = Math.floor(Math.random() * 9);
    const n7 = Math.floor(Math.random() * 9);
    const n8 = Math.floor(Math.random() * 9);
    const n9 = Math.floor(Math.random() * 9);

    // Calcula os dígitos verificadores
    let d1 = n9*10 + n8*9 + n7*8 + n6*7 + n5*6 + n4*5 + n3*4 + n2*3 + n1*2;
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;

    let d2 = d1*10 + n9*9 + n8*8 + n7*7 + n6*6 + n5*5 + n4*4 + n3*3 + n2*2 + n1*1;
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;

    // Formata o CPF com máscara
    return `***.*${n1}${n2}${n3}.${n4}${n5}${n6}-**`;
}

// Função para obter localização mais precisa
async function getLocationInfo(ip: string) {
    try {
        // API alternativa com mais detalhes
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
                city: data.city || 'Desconhecido',
                neighborhood: data.org || 'Não identificado',
                postal_code: data.postal || 'Não identificado',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || 'Desconhecido',
                network: data.org || 'Desconhecido'
            };
        }

        // Backup com ip-api.com
        const backupResponse = await fetch(`https://ip-api.com/json/${ip}`);
        if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            return {
                country: backupData.country || 'Desconhecido',
                state: backupData.regionName || 'Desconhecido',
                city: backupData.city || 'Desconhecido',
                neighborhood: backupData.isp || 'Não identificado',
                postal_code: backupData.zip || 'Não identificado',
                latitude: backupData.lat || null,
                longitude: backupData.lon || null,
                timezone: backupData.timezone || 'Desconhecido',
                network: backupData.isp || 'Desconhecido'
            };
        }

        // Fallback
        return {
            country: 'Desconhecido',
            state: 'Desconhecido',
            city: 'Desconhecido',
            neighborhood: 'Não identificado',
            postal_code: 'Não identificado',
            latitude: null,
            longitude: null,
            timezone: 'Desconhecido',
            network: 'Desconhecido'
        };
    } catch (error) {
        console.error('Erro ao obter localização:', error);
        return {
            country: 'Desconhecido',
            state: 'Desconhecido',
            city: 'Desconhecido',
            neighborhood: 'Não identificado',
            postal_code: 'Não identificado',
            latitude: null,
            longitude: null,
            timezone: 'Desconhecido',
            network: 'Desconhecido'
        };
    }
}

export { generateMaskedCPF, getLocationInfo };