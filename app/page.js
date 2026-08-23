'use client';
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Lock, CheckCircle, AlertCircle, Loader2, Download, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const YOGLET_PRODUCTS = [
  'COMB-NAT100',
  'COMB-NAT200',
  'COMB-BOL100',
  'COMB-MAN100',
  'COMB-MANA100'
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [orders, setOrders] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '0521') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Código incorrecto');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOrders([]);
    setValidationErrors([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
        
        let errors = [];
        let parsedOrders = [];

        data.forEach((row, index) => {
          const rowNum = index + 2; // Fila real en Excel (asumiendo cabecera en fila 1)
          const nit = (row['NIT'] || '').toString().trim();
          const codigoProducto = (row['Codigo_Producto'] || '').toString().trim().toUpperCase();
          const cantidad = parseInt(row['Cantidad'] || '0');
          const fechaEntrega = (row['Fecha_Entrega'] || '').toString().trim();
          const fechaVenc = (row['Fecha_Vencimiento'] || '').toString().trim();
          const observaciones = (row['Observaciones'] || '').toString().trim();

          // Regex para formato YYYY-MM-DD
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

          // Validación estricta
          if (!nit) {
            errors.push({ fila: rowNum, columna: 'NIT', mensaje: 'El NIT no puede estar vacío.' });
          }
          if (cantidad <= 0 || isNaN(cantidad)) {
            errors.push({ fila: rowNum, columna: 'Cantidad', mensaje: 'La cantidad debe ser un número mayor a cero.' });
          }
          if (!fechaEntrega || !dateRegex.test(fechaEntrega)) {
            errors.push({ fila: rowNum, columna: 'Fecha_Entrega', mensaje: 'Obligatorio. Debe tener formato AAAA-MM-DD (Ej: 2026-12-24).' });
          }
          if (!fechaVenc || !dateRegex.test(fechaVenc)) {
            errors.push({ fila: rowNum, columna: 'Fecha_Vencimiento', mensaje: 'Obligatorio. Debe tener formato AAAA-MM-DD (Ej: 2026-12-25).' });
          }
          if (!codigoProducto) {
            errors.push({ fila: rowNum, columna: 'Codigo_Producto', mensaje: 'El código del producto no puede estar vacío.' });
          } else {
            // Check if product is exactly one of the allowed Yoglet codes
            const isMatch = YOGLET_PRODUCTS.includes(codigoProducto);
            if (!isMatch) {
              errors.push({ 
                fila: rowNum, 
                columna: 'Codigo_Producto', 
                mensaje: `Código "${codigoProducto}" no es válido. Debe ser uno de: ${YOGLET_PRODUCTS.join(', ')}` 
              });
            }
          }

          parsedOrders.push({
            NIT: nit,
            Codigo_Producto: codigoProducto,
            Cantidad: cantidad,
            Fecha_Entrega: fechaEntrega,
            Fecha_Vencimiento: fechaVenc,
            Observaciones: observaciones
          });
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
        } else {
          setOrders(parsedOrders);
        }
      } catch (err) {
        console.error(err);
        setValidationErrors([{ fila: 0, columna: 'Archivo', mensaje: 'Error al procesar el archivo. Asegúrate de usar la plantilla correcta.' }]);
      }
    };
    reader.readAsBinaryString(file);
    // Limpiar input para permitir subir el mismo archivo tras corregirlo
    e.target.value = '';
  };

  const handleSendToPOS = async () => {
    if (orders.length === 0 || validationErrors.length > 0) return;
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidos: orders, pin: '0521' })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          type: 'success',
          message: `Se crearon ${data.success} cotizaciones en el POS.`,
          errors: data.errors
        });
        if (data.errors.length === 0) setOrders([]); 
      } else {
        setResult({ type: 'error', message: data.error || 'Error del servidor' });
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Fallo de conexión con el servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-800 p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center shadow-inner">
              <Lock size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Portal Administrativo</h2>
          <p className="text-center text-indigo-200 mb-8 font-light">Ingresa el PIN de seguridad</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-indigo-400 text-center text-2xl tracking-[0.5em] text-white outline-none placeholder:text-white/30 transition-all"
              autoFocus
            />
            {loginError && <p className="text-red-300 text-sm text-center font-medium">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-4 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2">
              Acceder <ChevronRight size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileSpreadsheet className="text-indigo-600" size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Carga Masiva de Cotizaciones</h1>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* PASO 1 */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">PASO 1</span>
                <h2 className="text-xl font-bold text-slate-800">Cargar Clientes en el POS</h2>
              </div>
              <p className="text-slate-600 max-w-2xl">
                Descarga la plantilla de clientes, pega allí los datos (NIT, Empresa, Dirección, etc.) e 
                <strong className="text-slate-800"> impórtala primero dentro del Módulo de Clientes del POS</strong>. 
                Si un cliente no existe en el POS, su cotización fallará.
              </p>
            </div>
            <a 
              href="/plantilla_clientes.xlsx" 
              download
              className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Download size={20} /> Descargar Plantilla Clientes
            </a>
          </div>
        </section>

        {/* PASO 2 */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">PASO 2</span>
                <h2 className="text-xl font-bold text-slate-800">Cargar Cotizaciones Automáticas</h2>
              </div>
              <p className="text-slate-600 max-w-2xl">
                Descarga la plantilla de cotizaciones. Copia y pega los datos desde tu Excel de respuestas (Google Forms) 
                respetando estrictamente las columnas. Luego sube el archivo aquí.
              </p>
            </div>
            <a 
              href="/plantilla_cotizaciones.xlsx" 
              download
              className="shrink-0 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Download size={20} /> Descargar Plantilla Cotizaciones
            </a>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-indigo-200 border-dashed rounded-2xl cursor-pointer hover:bg-indigo-50/50 transition-colors bg-slate-50">
            <Upload className="w-12 h-12 text-indigo-400 mb-4" />
            <span className="font-semibold text-slate-700 text-lg">Haz clic o arrastra tu archivo de cotizaciones aquí</span>
            <span className="text-slate-500 text-sm mt-1">Formatos soportados: .xlsx, .csv</span>
            <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
          </label>
        </section>

        {/* VALIDATION ERRORS */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-lg font-bold">¡Alto ahí! Se encontraron errores en tu archivo</h2>
            </div>
            <p className="text-red-600 mb-4">Corrige estos errores en tu Excel y vuelve a subir el archivo. No se enviará nada al POS hasta que el archivo esté 100% correcto.</p>
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-red-50 text-red-800 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Fila (Excel)</th>
                    <th className="px-6 py-3">Columna</th>
                    <th className="px-6 py-3">Error Detectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {validationErrors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3 font-medium text-red-900">{e.fila}</td>
                      <td className="px-6 py-3 text-red-800">{e.columna}</td>
                      <td className="px-6 py-3 text-red-600">{e.mensaje}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SERVER RESULT NOTIFICATION */}
        {result && (
          <div className={`p-6 rounded-3xl shadow-sm flex items-start gap-4 border ${result.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            {result.type === 'success' ? <CheckCircle className="text-emerald-500 mt-1" size={28} /> : <AlertCircle className="text-red-500 mt-1" size={28} />}
            <div className="flex-1">
              <h3 className="font-bold text-lg">{result.message}</h3>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 bg-white/60 rounded-xl p-4">
                  <p className="font-semibold mb-2">Errores del POS:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {result.errors.map((e, i) => <li key={i}><span className="font-medium">Fila {e.fila}:</span> {e.error}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW & SUBMIT */}
        {orders.length > 0 && validationErrors.length === 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center bg-emerald-50/30 gap-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle size={24} />
                <h2 className="font-bold text-lg">¡Archivo Perfecto! ({orders.length} pedidos detectados)</h2>
              </div>
              <button
                onClick={handleSendToPOS}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <span>Generar Cotizaciones en POS</span>}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">NIT</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Código Producto</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Cantidad</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">F. Entrega</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{o.NIT}</td>
                      <td className="px-6 py-4 text-slate-700 font-mono">{o.Codigo_Producto}</td>
                      <td className="px-6 py-4 font-bold text-indigo-600">{o.Cantidad}</td>
                      <td className="px-6 py-4 text-slate-700">{o.Fecha_Entrega}</td>
                      <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{o.Observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
