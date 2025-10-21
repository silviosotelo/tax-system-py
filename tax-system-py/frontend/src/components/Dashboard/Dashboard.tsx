/**
 * DASHBOARD PRINCIPAL
 * 
 * Vista consolidada del estado tributario del usuario con:
 * - Resumen de obligaciones próximas
 * - Gráficos de evolución IVA
 * - Proyección IRP anual
 * - Alertas y notificaciones
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface DashboardData {
  summary: {
    currentMonthIVA: {
      period: string;
      debitoFiscal: number;
      creditoFiscal: number;
      saldo: number;
      dueDate: string;
      daysUntilDue: number;
    };
    currentYearIRP: {
      grossIncome: number;
      deductibleExpenses: number;
      netIncome: number;
      projectedTax: number;
      progress: number; // Porcentaje del año transcurrido
    };
    nextObligation: {
      type: 'IVA' | 'IRP';
      period: string;
      dueDate: string;
      estimatedAmount: number;
      daysLeft: number;
      status: 'URGENT' | 'WARNING' | 'NORMAL';
    };
  };
  trends: {
    ivaHistory: Array<{
      period: string;
      debitoFiscal: number;
      creditoFiscal: number;
      saldo: number;
    }>;
    monthlyIncome: Array<{
      month: string;
      ingresos: number;
      egresos: number;
      rentaNeta: number;
    }>;
    expensesByCategory: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    read: boolean;
    createdAt: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (err) {
      setError('Error al cargar datos del dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    );
  }

  const { summary, trends, notifications } = data;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Tributario</h1>
        <p className="text-gray-600 mt-2">
          Resumen completo de tus obligaciones fiscales en Paraguay
        </p>
      </div>

      {/* Alerta de próximo vencimiento */}
      {summary.nextObligation && (
        <div
          className={`rounded-lg shadow p-6 ${
            summary.nextObligation.status === 'URGENT'
              ? 'bg-red-50 border-2 border-red-500'
              : summary.nextObligation.status === 'WARNING'
              ? 'bg-yellow-50 border-2 border-yellow-500'
              : 'bg-blue-50 border-2 border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Próximo Vencimiento: {summary.nextObligation.type}
              </h3>
              <p className="text-gray-700 mt-1">
                Período: {summary.nextObligation.period}
              </p>
              <p className="text-gray-700">
                Vence: {formatDate(new Date(summary.nextObligation.dueDate))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                {summary.nextObligation.daysLeft} días
              </p>
              <p className="text-sm text-gray-600">restantes</p>
              <p className="text-xl font-semibold text-gray-800 mt-2">
                {formatCurrency(summary.nextObligation.estimatedAmount)}
              </p>
              <p className="text-sm text-gray-600">estimado</p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de resumen principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card IVA Mes Actual */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              IVA {summary.currentMonthIVA.period}
            </h2>
            <span className="text-sm text-gray-500">
              Vence: {formatDate(new Date(summary.currentMonthIVA.dueDate))}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Débito Fiscal:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(summary.currentMonthIVA.debitoFiscal)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Crédito Fiscal:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(summary.currentMonthIVA.creditoFiscal)}
              </span>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Saldo a Pagar:</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.currentMonthIVA.saldo)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Faltan {summary.currentMonthIVA.daysUntilDue} días
              </span>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                Ver detalle →
              </button>
            </div>
          </div>
        </div>

        {/* Card IRP Año Actual */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              IRP {new Date().getFullYear()}
            </h2>
            <span className="text-sm text-gray-500">
              {summary.currentYearIRP.progress}% del año
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ingresos Brutos:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(summary.currentYearIRP.grossIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Gastos Deducibles:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(summary.currentYearIRP.deductibleExpenses)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Renta Neta:</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(summary.currentYearIRP.netIncome)}
              </span>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">IRP Proyectado:</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.currentYearIRP.projectedTax)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${summary.currentYearIRP.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Progreso del ejercicio fiscal
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Evolución IVA últimos 12 meses */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evolución IVA - Últimos 12 Meses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.ivaHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="debitoFiscal"
                name="Débito Fiscal"
                stroke="#3B82F6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="creditoFiscal"
                name="Crédito Fiscal"
                stroke="#10B981"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo a Pagar"
                stroke="#EF4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico: Ingresos vs Egresos mensuales */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ingresos vs Egresos - Este Año
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends.monthlyIncome}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#3B82F6" />
              <Bar dataKey="egresos" name="Egresos" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico: Distribución de gastos por categoría */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Distribución de Gastos por Categoría - Año {new Date().getFullYear()}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={trends.expensesByCategory}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
              >
                {trends.expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 mb-3">Detalle por Categoría</h4>
            {trends.expensesByCategory.map((cat, index) => (
              <div key={cat.category} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-700">{cat.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(cat.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{cat.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notificaciones recientes */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Notificaciones Recientes
          </h3>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver todas
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay notificaciones nuevas
            </p>
          ) : (
            notifications.slice(0, 5).map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border ${
                  notif.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                      {notif.priority === 'CRITICAL' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                          URGENTE
                        </span>
                      )}
                      {notif.priority === 'HIGH' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                          ALTA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(new Date(notif.createdAt))}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="ml-4">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition-colors">
          <span className="block text-lg">+ Nueva Transacción</span>
          <span className="block text-sm opacity-90 mt-1">Registrar ingreso o egreso</span>
        </button>

        <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition-colors">
          <span className="block text-lg">⚡ Ejecutar Scraping</span>
          <span className="block text-sm opacity-90 mt-1">Sincronizar con Marangatu</span>
        </button>

        <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow transition-colors">
          <span className="block text-lg">📊 Ver Reportes</span>
          <span className="block text-sm opacity-90 mt-1">Generar declaraciones</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;