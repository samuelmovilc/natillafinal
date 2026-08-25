'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

// ── Genera consecutivo con fecha y hora exacta ───────────────
function generarConsecutivo(index) {
  const now  = new Date();
  const yy   = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  const ss   = String(now.getSeconds()).padStart(2, '0');
  const idx  = String(index + 1).padStart(3, '0');
  return `CC-${yy}${mm}${dd}-${hh}${min}${ss}-${idx}`;
}

function fmt(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(n || 0);
}

function calcularTotal(row) {
  let total = 0;
  for (let i = 1; i <= 3; i++) {
    const cant  = parseFloat(row[`Item${i}_Cantidad`]    || 0);
    const precio = parseFloat(row[`Item${i}_Precio_Unit`] || 0);
    total += cant * precio;
  }
  return total;
}

function getItems(row) {
  const items = [];
  for (let i = 1; i <= 3; i++) {
    const desc  = row[`Item${i}_Descripcion`];
    const cant  = parseFloat(row[`Item${i}_Cantidad`]    || 0);
    const precio = parseFloat(row[`Item${i}_Precio_Unit`] || 0);
    if (desc && cant > 0) {
      items.push({ descripcion: desc, cantidad: cant, precio, total: cant * precio });
    }
  }
  return items;
}

// ── HTML de la cuenta de cobro para imprimir ────────────────
function generarHTML(cc, consecutivo) {
  const items  = getItems(cc);
  const total  = calcularTotal(cc);
  const hoy    = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaExacta = new Date().toLocaleTimeString('es-CO');

  const filas = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">${item.descripcion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${item.cantidad}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.precio)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(item.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cuenta de Cobro ${consecutivo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; padding: 35px; background: #fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a56db; padding-bottom:18px; margin-bottom:22px; }
    .emisor-nombre { font-size:1.3rem; font-weight:800; color:#1a56db; }
    .emisor-info { font-size:11px; color:#6b7280; margin-top:5px; line-height:1.6; }
    .doc-box { text-align:right; }
    .doc-box h1 { font-size:1.4rem; font-weight:800; color:#1a56db; letter-spacing:1px; }
    .doc-box .consec { font-size:1rem; font-weight:700; color:#111; margin-top:4px; }
    .doc-box .fecha { font-size:11px; color:#6b7280; margin-top:3px; }
    .seccion { margin-bottom:20px; }
    .sec-titulo { background:#1a56db; color:#fff; font-size:11px; font-weight:700; padding:5px 12px; border-radius:4px; margin-bottom:10px; display:inline-block; letter-spacing:0.5px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:5px 24px; }
    .campo { display:flex; gap:6px; margin-bottom:3px; }
    .etq { font-weight:700; font-size:11px; min-width:110px; color:#374151; }
    .val { font-size:11px; color:#111; }
    table { width:100%; border-collapse:collapse; }
    th { background:#1a56db; color:#fff; padding:8px 10px; font-size:11px; text-align:left; }
    .total-box { text-align:right; margin-top:14px; padding-top:12px; border-top:2px solid #1a56db; }
    .total-label { font-size:12px; color:#6b7280; }
    .total-valor { font-size:1.5rem; font-weight:800; color:#1a56db; }
    .banco-box { background:#eff6ff; border-left:4px solid #1a56db; padding:12px 16px; border-radius:6px; margin-top:16px; }
    .banco-box .banco-titulo { font-weight:700; font-size:12px; color:#1a56db; margin-bottom:6px; }
    .obs-box { background:#f9fafb; border-left:3px solid #e5e7eb; padding:10px 14px; border-radius:4px; margin-top:14px; font-size:11px; color:#374151; }
    .firmas { display:flex; justify-content:space-between; margin-top:60px; }
    .firma-col { text-align:center; width:220px; }
    .firma-linea { border-top:1px solid #374151; margin-bottom:8px; }
    .firma-nombre { font-size:11px; font-weight:700; }
    .firma-cargo { font-size:10px; color:#6b7280; }
    .footer { margin-top:30px; text-align:center; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:10px; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <!-- ENCABEZADO -->
  <div class="header">
    <div>
      <div class="emisor-nombre">${cc.Emisor_Nombre || '—'}</div>
      <div class="emisor-info">
        NIT/CC: ${cc.Emisor_NIT || '—'}<br>
        ${cc.Emisor_Telefono ? 'Tel: ' + cc.Emisor_Telefono : ''}
        ${cc.Emisor_Email ? ' | ' + cc.Emisor_Email : ''}<br>
        ${cc.Emisor_Direccion || ''}
      </div>
    </div>
    <div class="doc-box">
      <h1>CUENTA DE COBRO</h1>
      <div class="consec">${consecutivo}</div>
      <div class="fecha">Fecha: ${hoy}</div>
      <div class="fecha">Hora: ${horaExacta}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="seccion">
    <div class="sec-titulo">COBRAR A</div>
    <div class="grid2">
      <div class="campo"><span class="etq">Nombre:</span><span class="val">${cc.Cliente_Nombre || '—'}</span></div>
      <div class="campo"><span class="etq">NIT/Cédula:</span><span class="val">${cc.Cliente_NIT || '—'}</span></div>
      <div class="campo"><span class="etq">Dirección:</span><span class="val">${cc.Cliente_Direccion || '—'}</span></div>
      <div class="campo"><span class="etq">Teléfono:</span><span class="val">${cc.Cliente_Telefono || '—'}</span></div>
      ${cc.Cliente_Email ? `<div class="campo"><span class="etq">Email:</span><span class="val">${cc.Cliente_Email}</span></div>` : ''}
    </div>
  </div>

  <!-- ITEMS -->
  <div class="seccion">
    <div class="sec-titulo">DESCRIPCIÓN DE BIENES / SERVICIOS</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>Descripción</th>
          <th style="width:70px;text-align:center">Cant.</th>
          <th style="width:120px;text-align:right">P. Unitario</th>
          <th style="width:120px;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="total-box">
      <div class="total-label">TOTAL A COBRAR</div>
      <div class="total-valor">${fmt(total)}</div>
    </div>
  </div>

  <!-- DATOS BANCARIOS -->
  ${(cc.Emisor_Banco || cc.Emisor_Num_Cuenta) ? `
  <div class="banco-box">
    <div class="banco-titulo">💳 DATOS PARA EL PAGO</div>
    <div class="grid2">
      ${cc.Emisor_Banco      ? `<div class="campo"><span class="etq">Banco:</span><span class="val">${cc.Emisor_Banco}</span></div>` : ''}
      ${cc.Emisor_Tipo_Cuenta? `<div class="campo"><span class="etq">Tipo:</span><span class="val">${cc.Emisor_Tipo_Cuenta}</span></div>` : ''}
      ${cc.Emisor_Num_Cuenta ? `<div class="campo"><span class="etq">N° Cuenta:</span><span class="val">${cc.Emisor_Num_Cuenta}</span></div>` : ''}
      <div class="campo"><span class="etq">A nombre de:</span><span class="val">${cc.Emisor_Nombre}</span></div>
    </div>
  </div>` : ''}

  <!-- OBSERVACIONES -->
  ${cc.Observaciones ? `
  <div class="obs-box">
    <strong>Observaciones:</strong> ${cc.Observaciones}
  </div>` : ''}

  <!-- FIRMAS -->
  <div class="firmas">
    <div class="firma-col">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${cc.Emisor_Nombre || 'Quien Cobra'}</div>
      <div class="firma-cargo">NIT/CC: ${cc.Emisor_NIT || '—'}</div>
      <div class="firma-cargo">${cc.Firma_Pie || 'Quien Cobra'}</div>
    </div>
    <div class="firma-col">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${cc.Cliente_Nombre || 'Quien Paga'}</div>
      <div class="firma-cargo">NIT/CC: ${cc.Cliente_NIT || '—'}</div>
      <div class="firma-cargo">Quien Paga / Recibe</div>
    </div>
  </div>

  <div class="footer">
    Documento generado el ${hoy} a las ${horaExacta} | Consecutivo: ${consecutivo}
  </div>
</body>
</html>`;
}

export default function CuentasCobro() {
  const [cuentas, setCuentas]       = useState([]);
  const [fileName, setFileName]     = useState('');
  const [errores, setErrores]       = useState([]);
  const [generando, setGenerando]   = useState(false);
  const fileRef = useRef();

  // ── Descargar plantilla ────────────────────────────────────
  function downloadPlantilla() {
    const headers = [
      'Emisor_Nombre','Emisor_NIT','Emisor_Telefono','Emisor_Email','Emisor_Direccion',
      'Emisor_Banco','Emisor_Tipo_Cuenta','Emisor_Num_Cuenta',
      'Cliente_Nombre','Cliente_NIT','Cliente_Telefono','Cliente_Email','Cliente_Direccion',
      'Item1_Descripcion','Item1_Cantidad','Item1_Precio_Unit',
      'Item2_Descripcion','Item2_Cantidad','Item2_Precio_Unit',
      'Item3_Descripcion','Item3_Cantidad','Item3_Precio_Unit',
      'Observaciones','Firma_Pie'
    ];
    const ejemplo = [
      'YOGLET SAS','900123456-1','3002397590','yoglet@gmail.com','Cartagena Colombia',
      'Bancolombia','Ahorros','123-456789-00',
      'SAMUEL PRUEBA','1048938609','3001234567','samuel@gmail.com','Calle 10 #5-23',
      'COMBO NAVIDEÑO 100G NATILLA',10,18000,
      'COMBO NAVIDEÑO 200G',5,22000,
      '','','',
      'Pago contra entrega','YOGLET SAS - Representante Legal'
    ];
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Cuentas de Cobro');
    XLSX.writeFile(wb, 'plantilla_cuentas_cobro.xlsx');
  }

  // ── Leer Excel ─────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setCuentas([]);
    setErrores([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const XLSX = require('xlsx');
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) { setErrores(['El archivo está vacío.']); return; }
        if (rows.length > 10)  { setErrores(['Máximo 10 cuentas de cobro por archivo.']); return; }

        const errs = [];
        rows.forEach((row, i) => {
          const n = i + 2;
          if (!row['Emisor_Nombre'])        errs.push(`Fila ${n}: Emisor_Nombre vacío.`);
          if (!row['Emisor_NIT'])           errs.push(`Fila ${n}: Emisor_NIT vacío.`);
          if (!row['Cliente_Nombre'])       errs.push(`Fila ${n}: Cliente_Nombre vacío.`);
          if (!row['Cliente_NIT'])          errs.push(`Fila ${n}: Cliente_NIT vacío.`);
          if (!row['Item1_Descripcion'])    errs.push(`Fila ${n}: Item1_Descripcion vacío.`);
          if (!row['Item1_Cantidad'])       errs.push(`Fila ${n}: Item1_Cantidad vacío.`);
          if (!row['Item1_Precio_Unit'])    errs.push(`Fila ${n}: Item1_Precio_Unit vacío.`);
        });

        setErrores(errs);
        if (errs.length === 0) setCuentas(rows);
      } catch (err) {
        setErrores([`Error al leer el archivo: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  }

  // ── Generar PDFs ───────────────────────────────────────────
  function generarPDFs() {
    setGenerando(true);
    cuentas.forEach((cc, i) => {
      setTimeout(() => {
        const consecutivo = generarConsecutivo(i);
        const html = generarHTML(cc, consecutivo);
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        setTimeout(() => {
          ventana.print();
        }, 600);
        if (i === cuentas.length - 1) setGenerando(false);
      }, i * 1200); // 1.2s entre cada PDF para no saturar
    });
  }

  return (
    <main style={s.container}>
      <div style={s.topBar}>
        <div>
          <h1 style={s.title}>🧾 Generador de Cuentas de Cobro</h1>
          <p style={s.sub}>Carga el Excel con hasta 10 cuentas — genera un PDF profesional por cada fila automáticamente.</p>
        </div>
        <a href="/" style={s.btnBack}>← Volver al inicio</a>
      </div>

      {/* PASO 1 */}
      <section style={s.card}>
        <h2 style={s.h2}>1. Descarga la plantilla</h2>
        <p style={s.hint}>Llena cada fila con los datos de una cuenta de cobro. Máximo 10 filas.</p>
        <button onClick={downloadPlantilla} style={s.btnSec}>⬇ Descargar Plantilla Excel</button>
      </section>

      {/* PASO 2 */}
      <section style={s.card}>
        <h2 style={s.h2}>2. Sube el Excel con tus cuentas de cobro</h2>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current.click()} style={s.btnPri}>📂 Seleccionar archivo Excel</button>
        {fileName && <p style={{ marginTop: 10, fontSize: '0.9rem' }}>Archivo: <strong>{fileName}</strong></p>}

        {errores.length > 0 && (
          <div style={s.errBox}>
            <strong>⚠ Errores ({errores.length}):</strong>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              {errores.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {cuentas.length > 0 && errores.length === 0 && (
          <div style={s.okBox}>
            <strong>✅ {cuentas.length} cuenta(s) de cobro listas</strong>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cuentas.map((cc, i) => (
                <div key={i} style={s.ccItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>#{i + 1} — {cc.Cliente_Nombre}</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(calcularTotal(cc))}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
                    NIT: {cc.Cliente_NIT} | Emisor: {cc.Emisor_Nombre} | {getItems(cc).length} item(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* PASO 3 */}
      {cuentas.length > 0 && errores.length === 0 && (
        <section style={s.card}>
          <h2 style={s.h2}>3. Genera los PDFs</h2>
          <p style={s.hint}>
            Se abrirá <strong>{cuentas.length} ventana(s)</strong> de impresión, una por cuenta de cobro.
            Cada una tendrá su consecutivo único con fecha y hora exacta.
          </p>
          <button onClick={generarPDFs} disabled={generando} style={generando ? s.btnDis : s.btnOk}>
            {generando ? `⏳ Generando PDFs...` : `🖨️ Generar ${cuentas.length} Cuenta(s) de Cobro`}
          </button>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 8 }}>
            💡 Permite las ventanas emergentes en tu navegador si las bloquea.
          </p>
        </section>
      )}
    </main>
  );
}

const s = {
  container: { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui,sans-serif', color: '#1f2937' },
  topBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:     { fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 },
  sub:       { color: '#6b7280', fontSize: '0.9rem' },
  card:      { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: 20 },
  h2:        { fontSize: '1.05rem', fontWeight: 600, marginBottom: 10 },
  hint:      { fontSize: '0.85rem', color: '#6b7280', marginBottom: 12 },
  errBox:    { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginTop: 14, color: '#b91c1c', fontSize: '0.85rem' },
  okBox:     { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginTop: 14, color: '#166534', fontSize: '0.9rem' },
  ccItem:    { background: '#fff', border: '1px solid #d1fae5', borderRadius: 6, padding: '8px 12px' },
  btnPri:    { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 },
  btnSec:    { background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 500 },
  btnOk:     { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  btnDis:    { background: '#9ca3af', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'not-allowed' },
  btnBack:   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '8px 16px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' },
};
