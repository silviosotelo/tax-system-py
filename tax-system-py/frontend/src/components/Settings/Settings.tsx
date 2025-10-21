import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';

export default function Settings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsAPI.get();
        setSettings(response.data);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsAPI.update(settings);
      alert('Configuración guardada');
    } catch (error) {
      alert('Error al guardar');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Configuración</h1>
      
      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-4">Credenciales Marangatu</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Usuario</label>
              <input
                type="text"
                value={settings.marangatu_username || ''}
                onChange={(e) => setSettings({...settings, marangatu_username: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type="password"
                value={settings.marangatu_password || ''}
                onChange={(e) => setSettings({...settings, marangatu_password: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                placeholder="Dejar en blanco para no cambiar"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">API SET</h2>
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="text"
              value={settings.set_apikey || ''}
              onChange={(e) => setSettings({...settings, set_apikey: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Guardar Configuración
          </button>
        </div>
      </form>
    </div>
  );
}
