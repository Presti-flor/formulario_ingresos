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
  // Leer los parámetros de bloque y etapa desde la URL
  const bloque = req.query.bloque || '3'; // Si no se pasa el bloque, por defecto es 3
  const etapa = req.query.etapa || ''; // Etapa por defecto está vacía (no visible)

  // Variedades y tamaños por defecto según el bloque
  let variedades = [];
  let mostrarRuso = false;
  let seleccionVariedad = 'momentum'; // Valor por defecto

  if (bloque === '3') {
    variedades = [
      { value: 'momentum', label: 'Momentum' },
      { value: 'quick sand', label: 'Quick Sand' },
      { value: 'pink floyd', label: 'Pink Floyd' },
      { value: 'freedom', label: 'Freedom' },
    ];
    mostrarRuso = true; // Mostrar "Ruso" solo para Freedom
    seleccionVariedad = 'momentum'; // Cambia esto si quieres que por defecto sea otra variedad
  } else if (bloque === '4') {
    variedades = [
      { value: 'freedom', label: 'Freedom' },
      { value: 'hilux', label: 'Hilux' },
    ];
    mostrarRuso = true; // Mostrar "Ruso" solo para Freedom
    seleccionVariedad = 'freedom'; // Cambia esto si quieres que por defecto sea otra variedad
  }

  // Rellenar el formulario con las variedades correspondientes y ajustar el título
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
        <h2>Formulario de Registro para Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
        <form action="/submit" method="POST" id="registroForm">
          
          <label for="bloque">Bloque:</label>
          <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br> <!-- Solo número, no recuadro -->

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect" onchange="mostrarTamano()" value="${seleccionVariedad}">
            ${variedades.map(variedad => `
              <option value="${variedad.value}" ${seleccionVariedad === variedad.value ? 'selected' : ''}>${variedad.label}</option>
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

          <!-- Campo oculto para la etapa -->
          <input type="hidden" name="etapa" value="${etapa}" />

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

        // Al cargar la página, si el bloque es "4" y la variedad es "Freedom", se agrega "Ruso" automáticamente
        window.onload = function() {
          var variedad = document.getElementById('variedadSelect').value;
          if (variedad === 'freedom') {
            selectTamano('largo');  // Establecer por defecto el tamaño "Largo"
            mostrarTamano(); // Mostrar la opción "Ruso"
          }
        };

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
  const { variedad, tamano, numero_tallos, etapa } = req.body;  // Ahora recibimos "etapa" desde el formulario

  const bloque = req.query.bloque || '3';  // Obtenemos el bloque desde la URL, por defecto es 3

  const data = {
    fecha: new Date().toLocaleDateString(),
    bloque, // Usamos el bloque que viene de la URL
    variedad,
    tamaño: tamano,
    numero_tallos,
    etapa,  // Ahora se incluye la etapa
  };

  console.log(data); // Verifica los datos antes de enviarlos

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