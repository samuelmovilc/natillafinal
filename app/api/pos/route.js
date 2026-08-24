import { NextResponse } from 'next/server';

const BASE  = process.env.MICROSERVICIO_URL || 'http://89.117.56.39:3001';
const TOKEN = process.env.API_TOKEN         || '77c08577c9be234251c5ed346ad81f705f5d47aaf7ef98c4daa8b7cbe1060a53';
const PIN   = process.env.UPLOAD_PIN        || '0521';

function headers() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

async function parseRes(res, ctx) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const txt = await res.text();
    console.error(`[${ctx}] No-JSON:`, txt.slice(0, 300));
    return { ok: false, status: 502, data: { error: `Respuesta no-JSON en ${ctx}` } };
  }
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function GET() {
  if (!BASE || !TOKEN)
    return NextResponse.json({ error: 'MICROSERVICIO_URL o API_TOKEN no configurados en Vercel.' }, { status: 500 });
  try {
    const res = await fetch(`${BASE}/clientes`, { headers: headers(), cache: 'no-store' });
    const { ok, status, data } = await parseRes(res, 'GET /clientes');
    if (!ok) return NextResponse.json(data, { status });
    return NextResponse.json({ success: true, clients: data.data });
  } catch (e) {
    return NextResponse.json({ error: `Sin conexion al microservicio: ${e.message}` }, { status: 503 });
  }
}

export async function POST(request) {
  if (!BASE || !TOKEN)
    return NextResponse.json({ error: 'MICROSERVICIO_URL o API_TOKEN no configurados en Vercel.' }, { status: 500 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Body JSON invalido.' }, { status: 400 }); }

  const { pin, orders } = body;
  if (!pin || pin !== PIN)
    return NextResponse.json({ error: 'PIN de seguridad incorrecto.' }, { status: 403 });
  if (!Array.isArray(orders) || orders.length === 0)
    return NextResponse.json({ error: 'No se recibieron pedidos.' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/cotizaciones`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ orders }),
    });
    const { ok, status, data } = await parseRes(res, 'POST /cotizaciones');
    if (!ok) return NextResponse.json(data, { status });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: `Sin conexion al microservicio: ${e.message}` }, { status: 503 });
  }
}
