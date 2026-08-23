import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { pedidos, pin } = await req.json();

    if (pin !== '0521') {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
    }

    // 1. Iniciar sesión y obtener cookies/CSRF
    const loginUrl = 'https://demo.movilcontrol.com/login';
    const initialRes = await fetch(loginUrl);
    let cookies = initialRes.headers.get('set-cookie');
    const html = await initialRes.text();
    const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    if (!csrfToken) throw new Error("No se pudo obtener el token CSRF");

    // Limpiar cookies para fetch
    const cookieArray = cookies.split(',').map(c => c.split(';')[0]);
    let cookieString = cookieArray.join('; ');

    // 2. Hacer POST login
    const authRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString,
        'X-CSRF-TOKEN': csrfToken
      },
      body: new URLSearchParams({
        _token: csrfToken,
        email: 'demo@gmail.com',
        password: '12345678'
      })
    });

    if (authRes.status !== 200 && authRes.status !== 302) {
      throw new Error("Error de autenticación en el POS");
    }

    // Obtener cookies de sesión autenticada
    const authCookies = authRes.headers.get('set-cookie');
    if (authCookies) {
      const authCookieArray = authCookies.split(',').map(c => c.split(';')[0]);
      cookieString = authCookieArray.join('; ');
    }

    // 3. Obtener tablas (Clientes y Productos)
    const tablesRes = await fetch('https://demo.movilcontrol.com/quotations/tables', {
      headers: { 'Cookie': cookieString }
    });
    const tables = await tablesRes.json();
    const customers = tables.customers || [];
    
    // Obtener productos buscando "COMB" (simulación, normalmente vienen de /items)
    // Asumiremos que los combos existen y tenemos sus IDs fijos mapeados por Código Interno
    const YOGLET_ITEMS = {
      'COMB-NAT100': { id: 1438, name: 'COMBO NAVIDEÑO 100 GRAMOS NATILLA', price: 18000 },
      'COMB-NAT200': { id: 1439, name: 'COMBO NAVIDEÑO 200 GRAMOS', price: 22000 },
      'COMB-BOL100': { id: 1440, name: 'COMBO NAVIDEÑO 100 GRAMOS BOLSA', price: 15000 },
      'COMB-MAN100': { id: 1441, name: 'COMBO NAVIDEÑO MANJAR BLANCO 100 GRAMOS', price: 25000 },
      'COMB-MANA100': { id: 1442, name: 'COMBO NAVIDEÑO MANJAR BLANCO + NATILLA 100 GRAMOS', price: 30000 }
    };

    let successCount = 0;
    let errors = [];

    // 4. Procesar cada pedido
    for (let i = 0; i < pedidos.length; i++) {
      const p = pedidos[i];
      try {
        const nit = p.NIT?.toString().trim();
        const customer = customers.find(c => c.number === nit);
        
        if (!customer) {
          throw new Error(`Cliente con NIT ${nit} no encontrado en el POS. Cárgalo primero por CSV.`);
        }

        const itemCode = p.Codigo_Producto?.toString().trim().toUpperCase();
        const itemInfo = YOGLET_ITEMS[itemCode];
        if (!itemInfo) {
          throw new Error(`Código de Producto ${itemCode} no es válido o no es de Yoglet.`);
        }

        const qty = parseInt(p.Cantidad) || 1;
        const total = qty * itemInfo.price;

        const dateOfIssue = new Date().toISOString().split('T')[0];
        
        let observation = `Observaciones: ${p.Observaciones || ''}`;

        // Construir payload que simula el Form Vue
        const payload = {
          prefix: "COT",
          establishment_id: 1, // Oficina Principal
          date_of_issue: dateOfIssue,
          date_of_due: p.Fecha_Vencimiento || dateOfIssue,
          delivery_date: p.Fecha_Entrega || null,
          time_of_issue: "12:00:00",
          customer_id: customer.id,
          currency_type_id: "COP",
          exchange_rate_sale: 1,
          total_prepayment: 0,
          total_charge: 0,
          total_discount: 0,
          total_exportation: 0,
          total_free: 0,
          total_taxed: 0,
          total_unaffected: 0,
          total_exonerated: total,
          total_igv: 0,
          total_base_isc: 0,
          total_isc: 0,
          total_base_other_taxes: 0,
          total_other_taxes: 0,
          total_taxes: 0,
          total_value: total,
          total: total,
          description: observation,
          shipping_address: p.Direccion || '',
          payment_method_type_id: "10",
          items: [
            {
              item_id: itemInfo.id,
              item: { 
                id: itemInfo.id, 
                description: itemInfo.name, 
                sale_unit_price: itemInfo.price,
                unit_type_id: '10', // Unidades
                currency_type_id: 'COP'
              },
              quantity: qty,
              unit_value: itemInfo.price,
              unit_price: itemInfo.price,
              discount: 0,
              total_base_igv: itemInfo.price,
              percentage_igv: 0,
              total_igv: 0,
              total_taxes: 0,
              total_value: total,
              total: total,
              affectation_igv_type_id: '20' // Exonerado
            }
          ]
        };

        // Hacer POST para crear cotización
        const createRes = await fetch('https://demo.movilcontrol.com/quotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString,
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`El POS rechazó el pedido: ${createRes.status} ${errText.substring(0, 50)}`);
        }

        successCount++;
      } catch (err) {
        errors.push({ fila: i + 2, error: err.message });
      }
    }

    return NextResponse.json({ success: successCount, errors });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
