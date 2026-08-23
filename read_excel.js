const XLSX = require('xlsx');
const wb = XLSX.readFile('c:/Users/SAMUEL CARIBEP/Desktop/ANTIGRAVITY/AMOVILCONTROL - DESARROLLOS/Pedidos Natilla Medellin (Respuestas) (4).xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
console.log(data[0]); // Headers
