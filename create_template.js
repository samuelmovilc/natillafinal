const XLSX = require('xlsx');
const ws = XLSX.utils.aoa_to_sheet([
  ['NIT', 'Codigo_Producto', 'Cantidad', 'Fecha_Entrega', 'Fecha_Vencimiento', 'Direccion', 'Observaciones'],
  ['900123456', 'COMB-NAT100', '10', '2026-12-24', '2026-12-25', 'Calle 123', 'Anticipo Pagado']
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
XLSX.writeFile(wb, 'c:/Users/SAMUEL CARIBEP/Desktop/ANTIGRAVITY/AMOVILCONTROL - DESARROLLOS/vercel-app/public/plantilla_cotizaciones.xlsx');
