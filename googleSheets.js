const { google } = require('googleapis');

// Obtener las credenciales desde la variable de entorno
console.log(process.env.google_sheets_credentials); // Muestra las credenciales en consola (solo para debugging)
const creds = JSON.parse(process.env.google_sheets_credentials); // Parseamos la cadena JSON

// Autenticación con Google API
const auth = new google.auth.GoogleAuth({
  credentials: creds, // Usamos las credenciales obtenidas desde la variable de entorno
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ID de tu hoja de Google Sheets
const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';

// Función para agregar una nueva fila
async function addRecord(data) {
  // Limpieza del valor de 'bloque' para asegurarse que es solo un número
  const sanitizedBloque = data.bloque.replace(/[^0-9]/g, ''); // Elimina cualquier carácter no numérico del bloque

  // Depuración: Verificar los datos antes de enviarlos
  console.log('Datos antes de enviar a Google Sheets:', {

    unique_id: data.unique_id,
    fecha: data.fecha,
    bloque: sanitizedBloque, // Usamos el bloque limpiado
    variedad: data.variedad,
    tamaño: data.tamaño,
    numero_tallos: data.numero_tallos,
    etapa: data.etapa
  });

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'sobrante!A1', // Especifica la hoja "Sobrante" y la celda inicial
      valueInputOption: 'RAW',
      resource: {
        values: [
          [data.fecha, sanitizedBloque, data.variedad, data.tamaño, data.numero_tallos, data.etapa, data.tipo, data.unique_id],
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al guardar en Google Sheets:', error);
    throw error;  // Lanza el error para que se pueda manejar en el backend
  }
}

module.exports = { addRecord };