import { MapPin, Globe, Network } from 'lucide-react';

export default function StatCard({ accessLog }) {
    // Se não houver log de acesso, mostra um estado padrão
    if (!accessLog) {
        return (
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                    <div className="mr-4 text-blue-500">
                        <Globe />
                    </div>
                    <div>
                        <h3 className="text-gray-500">Localização</h3>
                        <p className="text-sm text-gray-400">Sem dados de acesso</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow space-y-3">
            {/* Localização */}
            <div className="flex items-center">
                <div className="mr-4 text-blue-500">
                    <MapPin />
                </div>
                <div>
                    <h3 className="text-gray-500">Localização</h3>
                    <p className="text-sm font-medium">
                        {accessLog.neighborhood}, {accessLog.city} - {accessLog.state}, {accessLog.country}
                    </p>
                </div>
            </div>

            {/* Coordenadas */}
            <div className="flex items-center">
                <div className="mr-4 text-green-500">
                    <Globe />
                </div>
                <div>
                    <h3 className="text-gray-500">Coordenadas</h3>
                    <p className="text-sm font-medium">
                        Lat: {accessLog.latitude?.toFixed(4) || 'N/A'}, 
                        Lon: {accessLog.longitude?.toFixed(4) || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Rede */}
            <div className="flex items-center">
                <div className="mr-4 text-purple-500">
                    <Network />
                </div>
                <div>
                    <h3 className="text-gray-500">Rede</h3>
                    <p className="text-sm font-medium">
                        {accessLog.network || 'Não identificada'}
                    </p>
                </div>
            </div>

            {/* Timezone */}
            <div className="flex items-center">
                <div className="mr-4 text-orange-500">
                    <Clock />
                </div>
                <div>
                    <h3 className="text-gray-500">Fuso Horário</h3>
                    <p className="text-sm font-medium">
                        {accessLog.timezone || 'Não identificado'}
                    </p>
                </div>
            </div>
        </div>
    );
}