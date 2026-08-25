'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const REQUIRED_COLS = ['NIT','Producto','Cantidad','Fecha_Entrega','Fecha_Vencimiento','Direccion','Observaciones'];

export default function Home() {
  const [pin, setPin]                 = useState('');
  const [orders, setOrders]           = useState([]);
  const [fileName, setFileName]       = useState('');
  const [parseErrors, setParseErrors] = useState([]);
  const [status, setStatus]           = useState('idle');
  const [result, setResult]           = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const fileRef = useRef();

  function downloadClientTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tipo_Documento','Numero_Documento','Nombre','Email','Telefono','Direccion','Ciudad'],
      ['CC','900123456','Cliente Ejemplo','cliente@email.com','3001234567','Calle 10 #5-23','Bucaramanga'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx');
  }

  function downloadQuotationTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      REQUIRED_COLS,
      ['900123456','Combo Yoglet Premium x12',2,'2024-12-20','2024-12-25','Calle 10 #5-23','Entregar en la tarde'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, 'plantilla_cotizaciones.xlsx');
  }

  function formatDate(val) {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const str = val.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setOrders([]); setParseErrors([]); setResult(null); setErrorMsg(''); setStatus('idle');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { setParseErrors(['El archivo esta vacio.']); return; }
        const cols    = Object.keys(rows[0]);
        const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
        if (missing.length > 0) { setParseErrors([`Columnas faltantes: ${missing.join(', ')}`]); return; }
        const errs = [], parsed = [];
        rows.forEach((row, i) => {
          const rowNum = i + 2;
          if (!row['NIT'])      errs.push(`Fila ${rowNum}: NIT vacio.`);
          if (!row['Producto']) errs.push(`Fila ${rowNum}: Producto vacio.`);
          if (!row['Cantidad'] || isNaN(Number(row['Cantidad'])) || Number(row['Cantidad']) < 1)
            errs.push(`Fila ${rowNum}: Cantidad invalida.`);
          if (!row['Fecha_Entrega'])     errs.push(`Fila ${rowNum}: Fecha_Entrega vacia.`);
          if (!row['Fecha_Vencimiento']) errs.push(`Fila ${rowNum}: Fecha_Vencimiento vacia.`);
          if (!errs.find(e => e.startsWith(`Fila ${rowNum}`))) {
            parsed.push({
              nit:             row['NIT'].toString().trim(),
              product:         row['Producto'].toString().trim(),
              quantity:        Number(row['Cantidad']),
              delivery_date:   formatDate(row['Fecha_Entrega']),
              expiration_date: formatDate(row['Fecha_Vencimiento']),
              address:         row['Direccion']?.toString().trim() || '',
              observations:    row['Observaciones']?.toString().trim() || '',
            });
          }
        });
        setParseErrors(errs);
        if (errs.length === 0) setOrders(parsed);
      } catch (err) {
        setParseErrors([`Error al leer el archivo: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleSubmit() {
    if (!pin)           { setErrorMsg('Ingresa el PIN de seguridad.'); return; }
    if (!orders.length) { setErrorMsg('No hay pedidos validos.'); return; }
    setStatus('loading'); setErrorMsg(''); setResult(null);
    try {
      const res  = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, orders }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Error del servidor.'); setStatus('error'); return; }
      setResult(data); setStatus('success');
    } catch (err) {
      setErrorMsg(`Error de red: ${err.message}`); setStatus('error');
    }
  }

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  return (
    <main style={s.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={s.title}>Cargue Masivo Combos Navidenos Yoglet</h1>
        <a href="/cuenta-cobro" style={s.btnCuentaCobro}>🧾 Cuenta de Cobro</a>
      </div>
      <p style={s.sub}>Sube el Excel de Google Forms para crear cotizaciones en el POS automaticamente.</p>

      <section style={s.card}>
        <h2 style={s.h2}>1. Descarga las plantillas</h2>
        <div style={s.row}>
          <button onClick={downloadClientTemplate} style={s.btnSec}>Plantilla Clientes</button>
          <button onClick={downloadQuotationTemplate} style={s.btnSec}>Plantilla Cotizaciones</button>
        </div>
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>2. Sube el Excel de cotizaciones</h2>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current.click()} style={s.btnPri}>Seleccionar archivo Excel</button>
        {fileName && <p style={{ marginTop: 10 }}>Archivo: <strong>{fileName}</strong></p>}
        {parseErrors.length > 0 && (
          <div style={s.errBox}>
            <strong>Errores ({parseErrors.length}):</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{parseErrors.map((e,i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
        {orders.length > 0 && parseErrors.length === 0 && (
          <div style={s.okBox}>
            <strong>{orders.length} pedidos validos</strong> listos para enviar.
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={s.table}>
                <thead><tr>{['#','NIT','Producto','Cant.','Entrega','Vence'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{orders.map((o,i) => (
                  <tr key={i}>
                    <td style={s.td}>{i+1}</td><td style={s.td}>{o.nit}</td>
                    <td style={s.td}>{o.product}</td><td style={s.td}>{o.quantity}</td>
                    <td style={s.td}>{o.delivery_date}</td><td style={s.td}>{o.expiration_date}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {orders.length > 0 && parseErrors.length === 0 && (
        <section style={s.card}>
          <h2 style={s.h2}>3. Confirmar y enviar</h2>
          <label style={s.label}>PIN de seguridad:</label>
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="****" style={s.input} />
          <button onClick={handleSubmit} disabled={status === 'loading'} style={status === 'loading' ? s.btnDis : s.btnOk}>
            {status === 'loading' ? 'Enviando al POS...' : `Crear ${orders.length} Cotizaciones`}
          </button>
          {errorMsg && <p style={{ color: '#dc2626', marginTop: 10 }}>{errorMsg}</p>}
        </section>
      )}

      {status === 'success' && result && (
        <section style={s.card}>
          <h2 style={s.h2}>Resultado</h2>
          <p>Creadas: <strong style={{ color: '#16a34a' }}>{result.creadas}</strong> | Fallidas: <strong style={{ color: result.fallidas > 0 ? '#dc2626' : '#6b7280' }}>{result.fallidas}</strong></p>
          {result.resultados?.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table style={s.table}>
                <thead><tr>{['#','NIT','Cliente','N Cot','Producto','Total'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{result.resultados.map((r,i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.fila}</td><td style={s.td}>{r.nit}</td>
                    <td style={s.td}>{r.cliente}</td><td style={s.td}>{r.numero}</td>
                    <td style={s.td}>{r.producto}</td><td style={s.td}>{fmt(r.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {result.errores?.length > 0 && (
            <div style={{ ...s.errBox, marginTop: 16 }}>
              <strong>Filas con error:</strong>
              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                {result.errores.map((e,i) => <li key={i}>Fila {e.fila} NIT {e.nit}: {e.razon}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const s = {
  container: { maxWidth: 920, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui,sans-serif', color: '#1f2937' },
  title:     { fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 },
  sub:       { color: '#6b7280', marginBottom: 24 },
  card:      { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: 20 },
  h2:        { fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 },
  row:       { display: 'flex', gap: 12, flexWrap: 'wrap' },
  label:     { display: 'block', fontWeight: 500, marginBottom: 6 },
  input:     { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: '1rem', width: 160, marginBottom: 14 },
  errBox:    { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginTop: 14, color: '#b91c1c', fontSize: '0.9rem' },
  okBox:     { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginTop: 14, color: '#166534', fontSize: '0.9rem' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th:        { background: '#e5e7eb', padding: '6px 10px', textAlign: 'left', fontWeight: 600 },
  td:        { padding: '5px 10px', borderBottom: '1px solid #e5e7eb' },
  btnPri:    { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 },
  btnSec:    { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 500 },
  btnOk:     { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' },
  btnDis:         { background: '#9ca3af', color: '#fff', border: 'none', borderRadius: 7, padding: '12px 24px', cursor: 'not-allowed', fontWeight: 700, fontSize: '1rem' },
  btnCuentaCobro: { background: '#1a56db', color: '#fff', borderRadius: 7, padding: '9px 18px', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' },
};
