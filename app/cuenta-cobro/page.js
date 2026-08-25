'use client';

import { useState, useEffect, useRef } from 'react';

const API_URL   = process.env.NEXT_PUBLIC_MICROSERVICIO_URL || '';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || '';

// ── Hardcodeados igual que en route.js ──────────────────────
const MICRO_URL = 'http://89.117.56.39:3001';
const TOKEN     = '77c08577c9be234251c5ed346ad81f705f5d47aaf7ef98c4daa8b7cbe1060a53';

export default function CuentaCobro() {
  const [cotizaciones, setCotizaciones]   = useState([]);
  const [cargando, setCargando]           = useState(true);
  const [cotSeleccionada, setCotSeleccionada] = useState(null);
  const [busqueda, setBusqueda]           = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Datos del generador (quien emite la cuenta de cobro)
  const [generador, setGenerador] = useState({
    nombre:    '',
    nit:       '',
    banco:     '',
    cuenta:    '',
    tipoCuenta:'Ahorros',
    telefono:  '',
    email:     '',
  });

  const printRef = useRef();

  useEffect(() => {
    fetch(`${MICRO_URL}/cotizaciones-lista`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })
      .then(r => r.json())
      .then(d => { setCotizaciones(d.data || []); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const cotFiltradas = cotizaciones.filter(c => {
    const q = busqueda.toLowerCase();
    return (
      c.numero?.toLowerCase().includes(q) ||
      c.cliente?.name?.toLowerCase().includes(q) ||
      c.cliente?.number?.toString().includes(q)
    );
  });

  function fmt(n) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(n);
  }

  function fmtFecha(f) {
    if (!f) return '';
    return new Date(f).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function handlePrint() {
    const contenido = printRef.current.innerHTML;
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Cuenta de Cobro - ${cotSeleccionada?.numero}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 30px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a56db; padding-bottom: 16px; margin-bottom: 20px; }
            .empresa-nombre { font-size: 20px; font-weight: bold; color: #1a56db; }
            .empresa-info { font-size: 11px; color: #555; margin-top: 4px; }
            .titulo-doc { text-align: right; }
            .titulo-doc h1 { font-size: 22px; font-weight: bold; color: #1a56db; }
            .titulo-doc p { font-size: 12px; color: #555; }
            .seccion { margin-bottom: 18px; }
            .seccion h3 { font-size: 12px; font-weight: bold; color: #fff; background: #1a56db; padding: 5px 10px; margin-bottom: 8px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
            .campo { display: flex; gap: 6px; margin-bottom: 3px; }
            .campo .etiqueta { font-weight: bold; min-width: 120px; font-size: 11px; }
            .campo .valor { font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #1a56db; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) td { background: #f9fafb; }
            .total-row { font-weight: bold; background: #eff6ff !important; }
            .total-grande { text-align: right; margin-top: 16px; font-size: 16px; font-weight: bold; color: #1a56db; border-top: 2px solid #1a56db; padding-top: 10px; }
            .obs { background: #f9fafb; border-left: 3px solid #1a56db; padding: 10px; font-size: 11px; margin-top: 8px; }
            .firma-box { margin-top: 50px; display: flex; justify-content: space-between; }
            .firma-linea { text-align: center; width: 200px; }
            .firma-linea .linea { border-top: 1px solid #000; margin-bottom: 6px; }
            .firma-linea p { font-size: 11px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); ventana.close(); }, 500);
  }

  const cot = cotSeleccionada;

  return (
    <main style={s.container}>
      <h1 style={s.title}>🧾 Generador de Cuenta de Cobro</h1>
      <p style={s.sub}>Selecciona una cotización existente y genera la cuenta de cobro en segundos.</p>

      {/* ── PASO 1: Datos del generador ── */}
      <section style={s.card}>
        <h2 style={s.h2}>1. Tus datos (quien emite la cuenta de cobro)</h2>
        <div style={s.grid2}>
          {[
            ['nombre',    'Nombre completo / Razón social *', 'text'],
            ['nit',       'NIT / Cédula *',                   'text'],
            ['banco',     'Banco',                            'text'],
            ['cuenta',    'Número de cuenta',                 'text'],
            ['telefono',  'Teléfono',                         'text'],
            ['email',     'Email',                            'email'],
          ].map(([campo, label, type]) => (
            <div key={campo} style={s.formGroup}>
              <label style={s.label}>{label}</label>
              <input
                type={type}
                value={generador[campo]}
                onChange={e => setGenerador(g => ({ ...g, [campo]: e.target.value }))}
                style={s.input}
                placeholder={label.replace(' *', '')}
              />
            </div>
          ))}
          <div style={s.formGroup}>
            <label style={s.label}>Tipo de cuenta</label>
            <select
              value={generador.tipoCuenta}
              onChange={e => setGenerador(g => ({ ...g, tipoCuenta: e.target.value }))}
              style={s.input}
            >
              <option>Ahorros</option>
              <option>Corriente</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── PASO 2: Seleccionar cotización ── */}
      <section style={s.card}>
        <h2 style={s.h2}>2. Selecciona la cotización</h2>
        <input
          type="text"
          placeholder="Buscar por número, cliente o NIT..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...s.input, width: '100%', marginBottom: 12 }}
        />
        {cargando ? (
          <p style={{ color: '#6b7280' }}>Cargando cotizaciones...</p>
        ) : (
          <div style={s.listaContainer}>
            {cotFiltradas.map(c => (
              <div
                key={c.id}
                onClick={() => setCotSeleccionada(c)}
                style={{
                  ...s.cotItem,
                  ...(cotSeleccionada?.id === c.id ? s.cotItemActivo : {})
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: cotSeleccionada?.id === c.id ? '#1a56db' : '#111' }}>
                    {c.numero}
                  </span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(c.total)}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 3 }}>
                  {c.cliente?.name} — {c.cliente?.number} | {fmtFecha(c.fecha_emision)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2 }}>
                  {c.items?.length} producto(s) | Entrega: {fmtFecha(c.fecha_entrega)}
                </div>
              </div>
            ))}
            {cotFiltradas.length === 0 && (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No se encontraron cotizaciones.</p>
            )}
          </div>
        )}
      </section>

      {/* ── PASO 3: Observaciones ── */}
      {cot && (
        <section style={s.card}>
          <h2 style={s.h2}>3. Observaciones (opcional)</h2>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Ej: Pago contra entrega, plazo 30 días, etc."
            style={{ ...s.input, width: '100%', height: 80, resize: 'vertical' }}
          />
          <button onClick={handlePrint} style={s.btnPrint}>
            🖨️ Generar y Exportar Cuenta de Cobro
          </button>
        </section>
      )}

      {/* ── DOCUMENTO IMPRIMIBLE (oculto en pantalla) ── */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {cot && (
            <>
              {/* Encabezado */}
              <div className="header">
                <div>
                  <div className="empresa-nombre">{generador.nombre || 'NOMBRE DEL GENERADOR'}</div>
                  <div className="empresa-info">
                    NIT: {generador.nit || '—'}<br/>
                    {generador.telefono && `Tel: ${generador.telefono}`}
                    {generador.email && ` | ${generador.email}`}
                  </div>
                </div>
                <div className="titulo-doc">
                  <h1>CUENTA DE COBRO</h1>
                  <p>Ref. Cotización: <strong>{cot.numero}</strong></p>
                  <p>Fecha: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="seccion">
                <h3>DATOS DEL CLIENTE</h3>
                <div className="grid2">
                  <div className="campo"><span className="etiqueta">Nombre:</span><span className="valor">{cot.cliente?.name}</span></div>
                  <div className="campo"><span className="etiqueta">NIT/Cédula:</span><span className="valor">{cot.cliente?.number}</span></div>
                  <div className="campo"><span className="etiqueta">Dirección:</span><span className="valor">{cot.cliente?.address}</span></div>
                  <div className="campo"><span className="etiqueta">Teléfono:</span><span className="valor">{cot.cliente?.telephone || '—'}</span></div>
                  <div className="campo"><span className="etiqueta">Email:</span><span className="valor">{cot.cliente?.email || '—'}</span></div>
                  <div className="campo"><span className="etiqueta">Dir. Entrega:</span><span className="valor">{cot.direccion_envio || '—'}</span></div>
                </div>
              </div>

              {/* Fechas */}
              <div className="seccion">
                <h3>INFORMACIÓN DE LA COTIZACIÓN</h3>
                <div className="grid2">
                  <div className="campo"><span className="etiqueta">Fecha emisión:</span><span className="valor">{fmtFecha(cot.fecha_emision)}</span></div>
                  <div className="campo"><span className="etiqueta">Fecha vencimiento:</span><span className="valor">{fmtFecha(cot.fecha_vencimiento)}</span></div>
                  <div className="campo"><span className="etiqueta">Fecha entrega:</span><span className="valor">{fmtFecha(cot.fecha_entrega)}</span></div>
                  <div className="campo"><span className="etiqueta">N° Cotización:</span><span className="valor">{cot.numero}</span></div>
                </div>
              </div>

              {/* Productos */}
              <div className="seccion">
                <h3>DETALLE DE PRODUCTOS / SERVICIOS</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'center' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>P. Unit.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cot.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="total-grande">
                TOTAL A COBRAR: {fmt(cot.total)}
              </div>

              {/* Datos de pago */}
              {(generador.banco || generador.cuenta) && (
                <div className="seccion" style={{ marginTop: 20 }}>
                  <h3>DATOS PARA EL PAGO</h3>
                  <div className="grid2">
                    {generador.banco   && <div className="campo"><span className="etiqueta">Banco:</span><span className="valor">{generador.banco}</span></div>}
                    {generador.cuenta  && <div className="campo"><span className="etiqueta">N° Cuenta:</span><span className="valor">{generador.cuenta}</span></div>}
                    {generador.tipoCuenta && <div className="campo"><span className="etiqueta">Tipo:</span><span className="valor">{generador.tipoCuenta}</span></div>}
                    {generador.nombre  && <div className="campo"><span className="etiqueta">A nombre de:</span><span className="valor">{generador.nombre}</span></div>}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {(observaciones || cot.observaciones) && (
                <div className="obs">
                  <strong>Observaciones:</strong><br/>
                  {observaciones || cot.observaciones}
                </div>
              )}

              {/* Firmas */}
              <div className="firma-box">
                <div className="firma-linea">
                  <div className="linea"></div>
                  <p><strong>{generador.nombre || 'Nombre del Generador'}</strong></p>
                  <p>NIT/CC: {generador.nit || '—'}</p>
                  <p>Quien Cobra</p>
                </div>
                <div className="firma-linea">
                  <div className="linea"></div>
                  <p><strong>{cot.cliente?.name}</strong></p>
                  <p>NIT/CC: {cot.cliente?.number}</p>
                  <p>Quien Paga</p>
                </div>
              </div>

              <div className="footer">
                Documento generado el {new Date().toLocaleString('es-CO')} | Ref. {cot.numero}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── PREVIEW en pantalla ── */}
      {cot && (
        <section style={s.card}>
          <h2 style={s.h2}>Vista previa</h2>
          <div style={s.preview}>
            <div style={s.previewHeader}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a56db' }}>
                  {generador.nombre || 'NOMBRE DEL GENERADOR'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  NIT: {generador.nit || '—'} | {generador.telefono}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a56db' }}>CUENTA DE COBRO</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Ref: {cot.numero}</div>
              </div>
            </div>

            <div style={s.previewSection}>
              <div style={s.sectionTitle}>CLIENTE</div>
              <div style={s.previewGrid}>
                <span><b>Nombre:</b> {cot.cliente?.name}</span>
                <span><b>NIT:</b> {cot.cliente?.number}</span>
                <span><b>Dirección:</b> {cot.cliente?.address}</span>
                <span><b>Entrega:</b> {cot.direccion_envio}</span>
              </div>
            </div>

            <div style={s.previewSection}>
              <div style={s.sectionTitle}>PRODUCTOS</div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Descripción','Cant.','P.Unit.','Total'].map(h =>
                      <th key={h} style={s.th}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cot.items?.map((item, i) => (
                    <tr key={i}>
                      <td style={s.td}>{item.name}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ ...s.td, textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                      <td style={{ ...s.td, textAlign: 'right' }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={s.totalPreview}>TOTAL A COBRAR: {fmt(cot.total)}</div>
            </div>

            {(generador.banco || generador.cuenta) && (
              <div style={s.previewSection}>
                <div style={s.sectionTitle}>PAGO</div>
                <div style={s.previewGrid}>
                  {generador.banco   && <span><b>Banco:</b> {generador.banco}</span>}
                  {generador.cuenta  && <span><b>Cuenta {generador.tipoCuenta}:</b> {generador.cuenta}</span>}
                </div>
              </div>
            )}

            {observaciones && (
              <div style={s.obsBanner}>
                <b>Observaciones:</b> {observaciones}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

const s = {
  container:      { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui,sans-serif', color: '#1f2937' },
  title:          { fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 },
  sub:            { color: '#6b7280', marginBottom: 24 },
  card:           { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: 20 },
  h2:             { fontSize: '1.05rem', fontWeight: 600, marginBottom: 14 },
  grid2:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' },
  formGroup:      { display: 'flex', flexDirection: 'column', gap: 4 },
  label:          { fontSize: '0.82rem', fontWeight: 500, color: '#374151' },
  input:          { border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: '0.9rem', outline: 'none' },
  listaContainer: { maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 },
  cotItem:        { border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', background: '#fff', transition: 'all 0.15s' },
  cotItemActivo:  { border: '2px solid #1a56db', background: '#eff6ff' },
  btnPrint:       { marginTop: 14, background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  preview:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.2rem' },
  previewHeader:  { display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1a56db', paddingBottom: 12, marginBottom: 14 },
  previewSection: { marginBottom: 14 },
  sectionTitle:   { background: '#1a56db', color: '#fff', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, borderRadius: 4, marginBottom: 8, display: 'inline-block' },
  previewGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: '0.85rem' },
  table:          { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: 6 },
  th:             { background: '#1a56db', color: '#fff', padding: '6px 10px', textAlign: 'left', fontSize: '0.8rem' },
  td:             { padding: '5px 10px', borderBottom: '1px solid #e5e7eb' },
  totalPreview:   { textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#1a56db', marginTop: 10, paddingTop: 8, borderTop: '2px solid #1a56db' },
  obsBanner:      { background: '#eff6ff', borderLeft: '3px solid #1a56db', padding: '8px 12px', fontSize: '0.85rem', marginTop: 10, borderRadius: 4 },
};
