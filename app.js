const express = require('express');
const bodyParser = require('body-parser');
const { addRecord } = require('./googleSheets');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ==================== RUTA PRINCIPAL ====================
app.get('/', (req, res) => {
  const bloque = req.query.bloque || '3';
  const etapa = req.query.etapa || '';
  const tipo  = req.query.tipo  || ''; // para diferenciar el formulario

  // ======= FORMULARIO TIPO NACIONAL =========
  if (tipo === 'nacional') {
    let variedades = [];
    if (bloque === '3') {
      variedades = [
        { value: 'momentum', label: 'Momentum' },
        { value: 'quick sand', label: 'Quick Sand' },
        { value: 'pink floyd', label: 'Pink Floyd' },
        { value: 'freedom',   label: 'Freedom' },
      ];
    } else if (bloque === '4') {
      variedades = [
        { value: 'freedom', label: 'Freedom' },
        { value: 'hilux',   label: 'Hilux' },
      ];
    }

    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Formulario Tallos Nacional</title>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
      </head>
      <body>
        <div class="form-container">
          <h1>REGISTRO NACIONAL</h1>
          <h2>Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
          <form action="/submit" method="POST">
            <label>Bloque:</label>
            <p style="font-size:1.5em; padding:10px;">${bloque}</p><br><br>

            <label>Variedad:</label>
            <select name="variedad" required>
              ${variedades.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
            </select><br><br>

            <label>Número de tallos:</label>
            <input type="number" name="numero_tallos" required><br><br>

            <!-- Campos ocultos -->
            <input type="hidden" name="bloque" value="${bloque}" />
            <input type="hidden" name="etapa"  value="${etapa}" />
            <input type="hidden" name="tipo"   value="nacional" />

            <input type="submit" value="Enviar">
          </form>
        </div>
      </body>
      </html>
    `);
  }

  // ======= FORMULARIO FIN DE CORTE =========
  let variedades = [];
  let seleccionVariedad = 'momentum';

  if (bloque === '3') {
    variedades = [
      { value: 'momentum',  label: 'Momentum' },
      { value: 'quick sand',label: 'Quick Sand' },
      { value: 'pink floyd',label: 'Pink Floyd' },
      { value: 'freedom',   label: 'Freedom' },
    ];
  } else if (bloque === '4') {
    variedades = [
      { value: 'freedom', label: 'Freedom' },
      { value: 'hilux',   label: 'Hilux' },
    ];
    seleccionVariedad = 'freedom';
  }

  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Formulario Fin de Corte / N° Tallos</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
    </head>
    <body>
      <div class="form-container">
        <h1>FIN DE CORTE REGISTRO</h1>
        <h2>Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
        <form action="/submit" method="POST" id="registroForm">
          <label>Bloque:</label>
          <p style="font-size:1.5em; padding:10px;">${bloque}</p><br><br>

          <label>Variedad:</label>
          <select name="variedad" required id="variedadSelect" onchange="mostrarTamano()" value="${seleccionVariedad}">
            ${variedades.map(v => `
              <option value="${v.value}" ${seleccionVariedad === v.value ? 'selected' : ''}>${v.label}</option>
            `).join('')}
          </select><br><br>

          <label>Elija Tamaño:</label>
          <div class="tamano-options" id="tamanoOptions">
            <div class="tamano-option" id="largo" onclick="selectTamano('largo')">Largo</div>
            <div class="tamano-option" id="corto" onclick="selectTamano('corto')">Corto</div>
          </div><br><br>

          <input type="hidden" name="tamano" required />

          <label>Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br><br>

          <!-- Campos ocultos -->
          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloque}" />
          <input type="hidden" name="tipo"   value="fin_corte" />

          <input type="submit" value="Enviar">
        </form>
      </div>

      <script>
        function selectTamano(tamano) {
          document.getElementById('largo').classList.remove('selected');
          document.getElementById('corto').classList.remove('selected');
          document.getElementById('ruso')?.classList.remove('selected');
          document.getElementById(tamano).classList.add('selected');
          document.querySelector('input[name="tamano"]').value = tamano;
        }
        function mostrarTamano() {
          var variedad = document.getElementById('variedadSelect').value;
          var tamanoOptions = document.getElementById('tamanoOptions');
          if (variedad === 'freedom' && !document.getElementById('ruso')) {
            var rusoOption = document.createElement('div');
            rusoOption.classList.add('tamano-option');
            rusoOption.id = 'ruso';
            rusoOption.innerHTML = 'Ruso';
            rusoOption.onclick = function(){ selectTamano('ruso'); };
            tamanoOptions.appendChild(rusoOption);
          } else if (variedad !== 'freedom') {
            var rusoOption = document.getElementById('ruso');
            if (rusoOption) rusoOption.remove();
          }
        }
        window.onload = function() {
          var variedad = document.getElementById('variedadSelect').value;
          if (variedad === 'freedom') {
            selectTamano('largo');
            mostrarTamano();
          }
        };
        document.getElementById('registroForm').onsubmit = function(e) {
          var tamano = document.querySelector('input[name="tamano"]').value;
          var numero = document.querySelector('input[name="numero_tallos"]').value.trim();
          document.querySelector('input[name="numero_tallos"]').value = numero;
          if (!tamano) { e.preventDefault(); alert('Seleccione el tamaño.'); }
          if (!numero || isNaN(numero)) { e.preventDefault(); alert('Ingrese un número válido.'); }
        }
      </script>
    </body>
    </html>
  `);
});

// ==================== RUTA POST ====================
app.post('/submit', async (req, res) => {
  const { variedad, tamano, numero_tallos, etapa, bloque, tipo } = req.body;

  const sanitizedBloque      = bloque.replace(/[^0-9]/g, '');
  const sanitizedNumeroTallos= parseInt(numero_tallos, 10);
  const fecha = new Date().toISOString().split('T')[0];

  const data = {
    fecha,
    bloque: sanitizedBloque,
    variedad,
    numero_tallos: sanitizedNumeroTallos,
    etapa: etapa || '',
    tipo:  tipo  || ''
  };

  // Solo agregar tamaño si NO es nacional
  if (tipo !== 'nacional') data.tamaño = tamano || '';

  console.log(data); // Verifica que tipo salga en consola

  try {
    await addRecord(data);
    // ✅ Redirección para evitar que al tocar "Atrás" reaparezca el formulario
    res.redirect('/gracias');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al guardar los datos.');
  }
});

// ==================== PÁGINA DE GRACIAS ====================
app.get('/gracias', (req, res) => {
  res.send(`
    <html lang="es">
    <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
    <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
      <h1>✅ Datos guardados correctamente</h1>
      <p>Gracias por su registro.<br>Para ingresar otro, vuelva a escanear el código QR.</p>
    </body>
    </html>
  `);
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
