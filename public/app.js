const express = require('express');
const bodyParser = require('body-parser');
const { addRecord } = require('./googleSheets');

const app = express();
const port = 3000;

// Middleware para servir archivos estáticos (como el CSS)
app.use(express.static('public')); // Asegúrate de tener una carpeta "public" con el archivo CSS dentro

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Ruta principal para servir el formulario
app.get('/', (req, res) => {
  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Formulario de Registro de Flores</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
    </head>
    <body>
      <div class="form-container">
        <h1>Registro de Flores</h1>
        <h2>Formulario de Registro</h2>
        <form action="/submit" method="POST">
          <label for="variedad">Variedad:</label>
          <select name="variedad" required>
            <option value="momentum">Momentum</option>
            <option value="quick sand">Quick Sand</option>
            <option value="pink floyd">Pink Floyd</option>
            <option value="freedom">Freedom</option>
          </select><br><br>

          <label for="tamano">Tamaño:</label>
          <select name="tamano" required>
            <option value="largo">Largo</option>
            <option value="corto">Corto</option>
          </select><br><br>

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br><br>

          <input type="submit" value="Enviar">
        </form>
      </div>
    </body>
    </html>
  `);
});

// Ruta para recibir y procesar el formulario
app.post('/submit', async (req, res) => {
  const { variedad, tamano, numero_tallos } = req.body;

  const data = {
    fecha: new Date().toLocaleDateString(),
    bloque: '3', // Bloque por defecto
    variedad,
    tamaño: tamano,
    numero_tallos,
  };

  try {
    const result = await addRecord(data);
    res.send('Datos guardados correctamente en Google Sheets.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al guardar los datos.');
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});