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
  // Headers para evitar cache del formulario
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const bloque = req.query.bloque || '3';
  const etapa = req.query.etapa || '';
  const tipo = req.query.tipo || '';

  // Verificar si los parámetros requeridos están presentes
  if (!req.query.bloque) {
    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Acceso no válido</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            margin: 50px auto; 
            max-width: 600px;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .error-icon {
            font-size: 4em;
            color: #ff4444;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background-color: #007BFF;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 1.1em;
            margin: 10px;
          }
          .btn:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">❌</div>
          <h1>Acceso no válido</h1>
          <p>Para acceder al formulario debe escanear el código QR correspondiente.</p>
          <p>El formulario no puede ser accedido directamente mediante URL.</p>
          <br>
          <p><strong>Por favor, escanee el QR nuevamente.</strong></p>
        </div>
        
        <script>
          // Limpiar cualquier parámetro de la URL
          if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
          }
          
          // Prevenir que el usuario pueda navegar atrás a esta página
          window.history.pushState(null, null, window.location.href);
          window.addEventListener('popstate', function() {
            window.history.go(1);
          });
        </script>
      </body>
      </html>
    `);
  }

  // ======= FORMULARIO TIPO NACIONAL =========
  if (tipo === 'nacional') {
    let variedades = [];
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
    }

    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Formulario Tallos Nacional</title>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
      </head>
      <body class="theme-nacional">
        <div class="form-container">
          <h1 class="title">REGISTRO NACIONAL</h1>
          <h2 class="subtitle">Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
          <form action="/submit" method="POST" id="nacionalForm">
            <label for="bloque">Bloque:</label>
            <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br>

            <label for="variedad">Variedad:</label>
            <select name="variedad" required>
              ${variedades.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
            </select><br><br>

            <label for="numero_tallos">Número de tallos:</label>
            <input type="number" name="numero_tallos" required><br><br>

            <!-- Campos ocultos -->
            <input type="hidden" name="bloque" value="${bloque}" />
            <input type="hidden" name="etapa" value="${etapa}" />
            <input type="hidden" name="tipo" value="nacional" />

            <input type="submit" value="Enviar">
          </form>
        </div>
        
        <script>
          // Prevenir que el usuario pueda navegar atrás
          window.history.pushState(null, null, window.location.href);
          window.addEventListener('popstate', function() {
            // Redirigir a página de acceso inválido si intentan retroceder
            window.location.href = '/';
          });

          // Limpiar formulario al cargar
          window.onload = function() {
            document.getElementById('nacionalForm').reset();
          };
        </script>
      </body>
      </html>
    `);
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

          <input type="hidden" name="tamano" required id="tamanoInput" />

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required id="numeroTallosInput"><br><br>

          <!-- Campos ocultos -->
          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloque}" />
          <input type="hidden" name="tipo" value="fin_corte" />

          <input type="submit" value="Enviar">
        </form>
      </div>

      <script>
        // Prevenir que el usuario pueda navegar atrás al formulario
        window.history.pushState(null, null, window.location.href);
        window.addEventListener('popstate', function() {
          // Redirigir a página de acceso inválido si intentan retroceder
          window.location.href = '/';
        });

        // Limpiar formulario al cargar
        window.onload = function() {
          resetForm();
        };

        function resetForm() {
          document.getElementById('registroForm').reset();
          document.getElementById('numeroTallosInput').value = '';
          document.getElementById('tamanoInput').value = '';
          
          // Resetear selección visual de tamaño
          document.getElementById('largo')?.classList.remove('selected');
          document.getElementById('corto')?.classList.remove('selected');
          document.getElementById('ruso')?.classList.remove('selected');
          
          // Configurar selección inicial según variedad
          var variedad = document.getElementById('variedadSelect').value;
          if (variedad === 'freedom') {
            selectTamano('largo');
            mostrarTamano();
          } else {
            selectTamano('largo');
          }
        }

        function selectTamano(tamano) {
          document.getElementById('largo')?.classList.remove('selected');
          document.getElementById('corto')?.classList.remove('selected');
          document.getElementById('ruso')?.classList.remove('selected');
          
          const element = document.getElementById(tamano);
          if (element) {
            element.classList.add('selected');
          }
          document.getElementById('tamanoInput').value = tamano;
        }

        function mostrarTamano() {
          var variedad = document.getElementById('variedadSelect').value;
          var tamanoOptions = document.getElementById('tamanoOptions');
          
          // Remover opción Ruso si existe
          var rusoOption = document.getElementById('ruso');
          if (rusoOption) rusoOption.remove();
          
          // Agregar opción Ruso solo para Freedom
          if (variedad === 'freedom') {
            if (!document.getElementById('ruso')) {
              var rusoOption = document.createElement('div');
              rusoOption.classList.add('tamano-option');
              rusoOption.id = 'ruso';
              rusoOption.innerHTML = 'Ruso';
              rusoOption.onclick = function() { selectTamano('ruso'); };
              tamanoOptions.appendChild(rusoOption);
            }
          }
          
          // Resetear selección
          selectTamano('largo');
        }

        document.getElementById('registroForm').onsubmit = function(e) {
          var tamano = document.getElementById('tamanoInput').value;
          var numeroTallos = document.getElementById('numeroTallosInput').value.trim();
          
          if (!tamano) {
            e.preventDefault();
            alert('Por favor seleccione el tamaño (Largo, Corto o Ruso si Freedom).');
            return false;
          }
          
          if (!numeroTallos || isNaN(numeroTallos) || parseInt(numeroTallos) <= 0) {
            e.preventDefault();
            alert('Por favor ingrese un número de tallos válido.');
            return false;
          }
          
          return true;
        }
      </script>
    </body>
    </html>
  `);
});

// ==================== RUTA POST ====================
app.post('/submit', ipWhitelist, async (req, res) => {
  const { variedad, tamano, numero_tallos, etapa, bloque, tipo } = req.body;

  const sanitizedBloque = (bloque || '').replace(/[^0-9]/g, '');
  const sanitizedNumeroTallos = parseInt(numero_tallos, 10);
  const fecha = new Date().toISOString().split('T')[0];

  // Validación adicional
  if (!sanitizedNumeroTallos || sanitizedNumeroTallos <= 0) {
    return res.status(400).send('Número de tallos inválido.');
  }

  const data = {
    fecha,
    bloque: sanitizedBloque,
    variedad,
    numero_tallos: sanitizedNumeroTallos,
    etapa: etapa || '',
    tipo: tipo || '',
  };

  // Solo agregar tamaño si NO es nacional
  if (tipo !== 'nacional') {
    if (!tamano) {
      return res.status(400).send('Tamaño no seleccionado.');
    }
    data.tamaño = tamano;
  }

  console.log('[SUBMIT]', {
    fromIp: getClientIp(req),
    data
  });

  try {
    await addRecord(data);
    // Enviar página de éxito que cierra la ventana automáticamente
    res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registro Exitoso</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 50px auto;
            max-width: 600px;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .success-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success-icon {
            font-size: 4em;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          .success-message {
            color: #4CAF50;
            font-size: 1.5em;
            margin-bottom: 30px;
          }
          .auto-close {
            color: #666;
            font-style: italic;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✅</div>
          <div class="success-message">Datos guardados correctamente</div>
          <p>Esta ventana se cerrará automáticamente en 3 segundos.</p>
          <p class="auto-close">Por favor, escanee el QR nuevamente para un nuevo registro.</p>
        </div>

        <script>
          // Prevenir navegación hacia atrás
          window.history.pushState(null, null, window.location.href);
          window.addEventListener('popstate', function() {
            window.close();
          });

          // Cerrar ventana automáticamente después de 3 segundos
          setTimeout(() => {
            window.close();
          }, 3000);

          // También permitir cerrar con clic en cualquier parte
          document.body.addEventListener('click', function() {
            window.close();
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send(`
      <html>
      <head><meta charset="UTF-8"><title>Error</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1 style="color:red;">❌ Error al guardar los datos</h1>
        <p>Por favor intente nuevamente.</p>
        <button onclick="window.close()">Cerrar</button>
      </body>
      </html>
    `);
  }
});

// ==================== RUTA PARA CERRAR VENTANA ====================
app.get('/close', (req, res) => {
  res.send(`
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cerrar</title>
      <script>
        window.close();
      </script>
    </head>
    <body>
      <p>Si la ventana no se cierra automáticamente, por favor ciérrela manualmente.</p>
      <button onclick="window.close()">Cerrar Ventana</button>
    </body>
    </html>
  `);
});

// ==================== MANEJO DE ERRORES 404 ====================
app.use((req, res) => {
  res.status(404).send(`
    <html>
    <head><meta charset="UTF-8"><title>Página no encontrada</title></head>
    <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
      <h1>404 - Página no encontrada</h1>
      <p>Por favor, escanee el QR válido para acceder al formulario.</p>
      <button onclick="window.close()">Cerrar Ventana</button>
    </body>
    </html>
  `);
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  console.log(`IPs permitidas: ${ALLOWED_IPS.join(', ')}`);
});