import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import Button from '../Shared/Button';
import Input from '../Shared/Input';

export default function Settings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get();
      setSettings(response.data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Configuración del Sistema</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Credenciales Marangatu</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configurar credenciales para web scraping automático desde Marangatu
          </p>
          
          <Input
            label="Usuario Marangatu"
            name="marangatu_username"
            value={settings.marangatu_username || ''}
            onChange={(e) => setSettings({...settings, marangatu_username: e.target.value})}
            placeholder="Ej: 4895448-9"
          />

          <Input
            label="Clave de Acceso Confidencial"
            name="marangatu_password"
            type="password"
            value={settings.marangatu_password || ''}
            onChange={(e) => setSettings({...settings, marangatu_password: e.target.value})}
            placeholder="Tu clave de Marangatu (se encriptará)"
          />

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auto_scrape_enabled || false}
                onChange={(e) => setSettings({...settings, auto_scrape_enabled: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Activar scraping automático</span>
            </label>
          </div>

          {settings.auto_scrape_enabled && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
              <select
                value={settings.auto_scrape_frequency || 'WEEKLY'}
                onChange={(e) => setSettings({...settings, auto_scrape_frequency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">API de la SET</h2>
          <p className="text-sm text-gray-600 mb-4">
            API Key para validación de RUC en tiempo real
          </p>
          
          <Input
            label="API Key SET"
            name="set_apikey"
            value={settings.set_apikey || ''}
            onChange={(e) => setSettings({...settings, set_apikey: e.target.value})}
            placeholder="Tu API Key de la SET"
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Notificaciones</h2>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email_notifications || false}
                onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Recibir notificaciones por email</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
          <Button type="button" variant="secondary" onClick={loadSettings}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
