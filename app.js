const express = require('express');
const bodyParser = require('body-parser');
const { addRecord } = require('./googleSheets');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== IP Whitelist Setup ======
app.set('trust proxy', true);

const ALLOWED_IPS = (process.env.ALLOWED_IPS || '186.102.77.146,190.61.45.230,192.168.10.23,192.168.10.1')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function ipWhitelist(req, res, next) {
  if (!ALLOWED_IPS.length) return next();
  const ip = getClientIp(req);
  const ok = ALLOWED_IPS.some(allowed => ip === allowed || (allowed.endsWith('.') && ip.startsWith(allowed)));
  if (!ok) {
    console.warn(`Bloqueado: IP ${ip} no permitida`);
    return res.status(403).send('Acceso denegado: IP no autorizada para enviar formularios.');
  }
  next();
}

// ==================== RUTA PRINCIPAL ====================
app.get('/', (req, res) => {
  // --- CABECERAS ANTICACHE CRÍTICAS PARA MÓVIL ---
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const bloque = req.query.bloque || '3';
  const etapa = req.query.etapa || '';
  const tipo = req.query.tipo || '';

  if (tipo === 'nacional') {
    // ... (el código para el formulario nacional permanece IDÉNTICO al que tienes) ...
    return res.send(`...`);
  }

  // ======= FORMULARIO ORIGINAL (fin de corte) =========
  let variedades = [];
  let seleccionVariedad = 'momentum';

  if (bloque === '3') {
    variedades = [
      { value: 'momentum', label: 'Momentum' },
      { value: 'quick sand', label: 'Quick Sand' },
      { value: 'pink floyd', label: 'Pink Floyd' },
      { value: 'freedom', label: 'Freedom' },
    ];
  } else if (bloque === '4') {
    variedades = [
      { value: 'freedom', label: 'Freedom' },
      { value: 'hilux', label: 'Hilux' },
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
    <body class="theme-default">
      <div class="form-container">
        <h1>FIN DE CORTE REGISTRO</h1>
        <h2>Registro</h2>
        <h2>Formulario de Registro para</h2>
        <h1>Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h1>

        <form action="/submit" method="POST" id="registroForm">
          <label for="bloque">Bloque:</label>
          <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br>

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect" onchange="mostrarTamano()">
            ${variedades.map(variedad => `
              <option value="${variedad.value}" ${seleccionVariedad === variedad.value ? 'selected' : ''}>${variedad.label}</option>
            `).join('')}
          </select><br><br>

          <label for="tamano">Elija Tamaño:</label>
          <div class="tamano-options" id="tamanoOptions">
            <div class="tamano-option" id="largo" onclick="selectTamano('largo')">Largo</div>
            <div class="tamano-option" id="corto" onclick="selectTamano('corto')">Corto</div>
          </div><br><br>

          <input type="hidden" name="tamano" id="hiddenTamano" required />

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" id="numero_tallos" required><br><br>

          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloque}" />
          <input type="hidden" name="tipo" value="fin_corte" />

          <input type="submit" value="Enviar">
        </form>
      </div>

      <script>
        // --- FUNCIÓN PARA LIMPIAR EL FORMULARIO ---
        function limpiarFormulario() {
          document.getElementById('registroForm').reset();
          document.querySelectorAll('.tamano-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          document.getElementById('hiddenTamano').value = '';
          // Restablecer la selección visual inicial si es Freedom
          if (document.getElementById('variedadSelect').value === 'freedom') {
            selectTamano('largo');
          }
        }

        // --- DETECTAR SI LA PÁGINA SE CARGA AL USAR "ATRÁS" ---
        window.onpageshow = function(event) {
          if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            limpiarFormulario();
          }
        };

        // --- FUNCIONES ORIGINALES DEL FORMULARIO ---
        function selectTamano(tamano) {
          document.getElementById('largo').classList.remove('selected');
          document.getElementById('corto').classList.remove('selected');
          document.getElementById('ruso')?.classList.remove('selected');
          document.getElementById(tamano).classList.add('selected');
          document.getElementById('hiddenTamano').value = tamano;
        }

        function mostrarTamano() {
          var variedad = document.getElementById('variedadSelect').value;
          var tamanoOptions = document.getElementById('tamanoOptions');
          if (variedad === 'freedom') {
            if (!document.getElementById('ruso')) {
              var rusoOption = document.createElement('div');
              rusoOption.classList.add('tamano-option');
              rusoOption.id = 'ruso';
              rusoOption.innerHTML = 'Ruso';
              rusoOption.onclick = function() { selectTamano('ruso'); };
              tamanoOptions.appendChild(rusoOption);
            }
          } else {
            var rusoOption = document.getElementById('ruso');
            if (rusoOption) rusoOption.remove();
            // Si la variedad no es Freedom y no hay tamaño seleccionado, seleccionar uno por defecto
            if (!document.getElementById('hiddenTamano').value) {
              selectTamano('largo');
            }
          }
        }

        // --- VALIDACIÓN ORIGINAL AL ENVIAR ---
        document.getElementById('registroForm').onsubmit = function(e) {
          var tamano = document.getElementById('hiddenTamano').value;
          var numeroTallos = document.getElementById('numero_tallos').value.trim();
          if (!tamano) {
            e.preventDefault();
            alert('Por favor seleccione el tamaño (Largo, Corto o Ruso si Freedom).');
          }
          if (!numeroTallos || isNaN(numeroTallos)) {
            e.preventDefault();
            alert('Por favor ingrese un número de tallos válido.');
          }
        }

        // Inicialización al cargar
        window.onload = function() {
          if (document.getElementById('variedadSelect').value === 'freedom') {
            selectTamano('largo');
            mostrarTamano();
          } else {
            selectTamano('largo'); // Asegurar que siempre haya un tamaño seleccionado por defecto
          }
        };
      </script>
    </body>
    </html>
  `);
});

// ==================== NUEVA RUTA PARA ÉXITO ====================
app.get('/success', (req, res) => {
  // También prevenir cache en la página de éxito
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registro Exitoso</title>
        <style>
            body {
                font-family: sans-serif;
                text-align: center;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .container {
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 2rem;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                max-width: 90%;
            }
            h1 { color: #4CAF50; margin-top: 0; }
            .btn {
                display: inline-block;
                margin: 10px;
                padding: 12px 24px;
                background: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 25px;
                cursor: pointer;
                border: none;
                font-size: 1rem;
            }
            .btn-close { background: #ff4757; }
            .instructions {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
                color: #555;
            }
            .instructions img { max-width: 100%; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ Registro Exitoso</h1>
            <p>Los datos se han guardado correctamente en el sistema.</p>

            <div class="instructions">
                <p><strong>¿Estás en un celular?</strong></p>
                <p>Para volver al escáner, cierra esta pestaña manualmente:</p>
                <ul>
                    <li><strong>Android/Chrome:</strong> Toca el ícono de "Tabs" (cuadrados) y desliza esta pestaña hacia la izquierda.</li>
                    <li><strong>iPhone/Safari:</strong> Toca el ícono de "Opciones" (dos cuadrados) y la "X" en esta pestaña.</li>
                </ul>
            </div>

            <button class="btn" onclick="intentarCerrar()">Intentar Cerrar Pestaña</button>
            <br>
            <a href="/" class="btn">Volver al Escáner</a>
        </div>

        <script>
            function intentarCerrar() {
                // Intento principal: cerrar la ventana.
                if (window.history.length > 1) {
                    // Si hay historial, intentar retroceder dos pasos (saltando el formulario enviado por POST)
                    window.history.go(-2);
                } else {
                    // Si no hay mucho historial, intentar cerrar la ventana.
                    window.close();
                }
                // Si el cierre no funciona, mostrar alerta después de un breve retraso.
                setTimeout(() => {
                    alert("Si la pestaña no se cerró, por favor ciérrala manualmente como se indica en las instrucciones.");
                }, 500);
            }

            // Intentar cerrar con la tecla Escape (útil en PCs)
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    intentarCerrar();
                }
            });
        </script>
    </body>
    </html>
  `);
});

// ==================== RUTA POST MODIFICADA (PRG Pattern) ====================
app.post('/submit', ipWhitelist, async (req, res) => {
  const { variedad, tamano, numero_tallos, etapa, bloque, tipo } = req.body;

  const sanitizedBloque = (bloque || '').replace(/[^0-9]/g, '');
  const sanitizedNumeroTallos = parseInt(numero_tallos, 10);
  const fecha = new Date().toISOString().split('T')[0];

  const data = {
    fecha,
    bloque: sanitizedBloque,
    variedad,
    numero_tallos: sanitizedNumeroTallos,
    etapa: etapa || '',
    tipo: tipo || '',
  };

  if (tipo !== 'nacional') {
    data.tamaño = tamano;
  }

  console.log('[SUBMIT]', {
    fromIp: getClientIp(req),
    data
  });

  try {
    await addRecord(data);
    // *** CAMBIO CRUCIAL: Redirigir en lugar de enviar HTML ***
    res.redirect('/success');
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al guardar los datos.');
  }
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});