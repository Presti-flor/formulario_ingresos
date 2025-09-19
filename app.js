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
  // Leer el parámetro de bloque de la URL
  const bloque = req.query.bloque || '3'; // Si no se pasa el bloque, por defecto es 3

  // Variedades y tamaños por defecto según el bloque
  let variedades = [];
  let mostrarRuso = false;

  if (bloque === '3') {
    variedades = [
      { value: 'momentum', label: 'Momentum' },
      { value: 'quick sand', label: 'Quick Sand' },
      { value: 'pink floyd', label: 'Pink Floyd' },
      { value: 'freedom', label: 'Freedom' },
    ];
    mostrarRuso = true; // Mostrar "Ruso" solo para Freedom
  } else if (bloque === '4') {
    variedades = [
      { value: 'freedom', label: 'Freedom' },
      { value: 'hilux', label: 'Hilux' },
    ];
    mostrarRuso = true; // Mostrar "Ruso" solo para Freedom
  }

  // Rellenar el formulario con las variedades correspondientes
  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Formulario Fin de Corte / N° Tallos </title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
    </head>
    <body>
      <div class="form-container">
        <h1>Registro de Flores / Fin de Corte</h1>
        <h2>Formulario de Registro para Bloque ${bloque}</h2>
        <form action="/submit" method="POST" id="registroForm">
          
          <label for="bloque">Bloque:</label>
          <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br> <!-- Solo número, no recuadro -->

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect" onchange="mostrarTamano()">
            ${variedades.map(variedad => `
              <option value="${variedad.value}">${variedad.label}</option>
            `).join('')}
          </select><br><br>

          <label for="tamano">Elija Tamaño:</label>
          <div class="tamano-options" id="tamanoOptions">
            <div class="tamano-option" id="largo" onclick="selectTamano('largo')">Largo</div>
            <div class="tamano-option" id="corto" onclick="selectTamano('corto')">Corto</div>
          </div><br><br>

          <!-- Campo oculto para el tamaño -->
          <input type="hidden" name="tamano" required />
          
          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br><br>

          <input type="submit" value="Enviar">
        </form>
      </div>

      <script>
        // Script para seleccionar el tamaño (Largo / Corto / Ruso)
        function selectTamano(tamano) {
          document.getElementById('largo').classList.remove('selected');
          document.getElementById('corto').classList.remove('selected');
          document.getElementById('ruso')?.classList.remove('selected'); // Eliminar la selección de "Ruso" si existe

          document.getElementById(tamano).classList.add('selected');
          document.querySelector('input[name="tamano"]').value = tamano;
        }

        // Mostrar opciones de tamaño y "Ruso" solo si se selecciona "Freedom"
        function mostrarTamano() {
          var variedad = document.getElementById('variedadSelect').value;
          var tamanoOptions = document.getElementById('tamanoOptions');
          
          // Si la variedad es "Freedom", añadir la opción "Ruso"
          if (variedad === 'freedom') {
            var rusoOption = document.createElement('div');
            rusoOption.classList.add('tamano-option');
            rusoOption.id = 'ruso';
            rusoOption.innerHTML = 'Ruso';
            rusoOption.onclick = function() {
              selectTamano('ruso');
            };
            tamanoOptions.appendChild(rusoOption); // Agregar opción "Ruso"
          } else {
            var rusoOption = document.getElementById('ruso');
            if (rusoOption) {
              rusoOption.remove(); // Eliminar opción "Ruso" si no es "Freedom"
            }
          }
        }

        // Validación del formulario antes de enviarlo
        document.getElementById('registroForm').onsubmit = function(e) {
          var tamano = document.querySelector('input[name="tamano"]').value;
          if (!tamano) {
            e.preventDefault();
            alert('Por favor seleccione el tamaño (Largo, Corto o Ruso si Freedom).');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Ruta para recibir y procesar el formulario
app.post('/submit', async (req, res) => {
  const { variedad, tamano, numero_tallos } = req.body;

  const data = {
    fecha: new Date().toLocaleDateString(),
    bloque: '3', // Bloque por defecto, puedes ajustarlo según el parámetro de la URL
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