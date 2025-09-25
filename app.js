// app.js
const express = require('express');
const bodyParser = require('body-parser');
const { addRecord } = require('./googleSheets');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== IP Whitelist Setup ======
app.set('trust proxy', true); // respeta X-Forwarded-For detrás de proxy/reverse proxy

// Configura IPs permitidas por variable de entorno: ALLOWED_IPS="127.0.0.1,192.168.1.,10.0.0.5"
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '186.102.77.146,190.61.45.230,192.168.10.23,192.168.10.1')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']?.trim()
        || req.ip
        || req.connection?.remoteAddress
        || '';
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', ''); // normaliza IPv6-mapeado
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

function ipWhitelist(req, res, next) {
  if (!ALLOWED_IPS.length) return next(); // en dev, si no configuras IPs, no bloquea
  const ip = getClientIp(req);
  const ok = ALLOWED_IPS.some(allowed => ip === allowed || (allowed.endsWith('.') && ip.startsWith(allowed)));
  if (!ok) {
    console.warn(`Bloqueado: IP ${ip} no permitida`);
    return res.status(403).send('Acceso denegado: IP no autorizada para enviar formularios.');
  }
  next();
}

// ====== Anti-cache ======
function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
}

// ==================== RUTA PRINCIPAL (FORM) ====================
app.get('/', noStore, (req, res) => {
  const bloque = req.query.bloque;
  const etapa = req.query.etapa || '';
  const tipo = req.query.tipo || ''; // nacional | fin_corte (default)

  // (Opcional) Exigir re-escanear QR cada visita si REQUIRE_QR=1
  // El QR debe incluir ?qr=1&bloque=...&tipo=... (o al menos ?qr=1)
  const requireQR = process.env.REQUIRE_QR === '1';
  const qrOK = req.query.qr === '1';

  if (requireQR && !qrOK) {
    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Escanear QR</title>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
        <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
        <meta http-equiv="Pragma" content="no-cache"/>
        <meta http-equiv="Expires" content="0"/>
      </head>
      <body class="theme-default">
        <div class="form-container" style="text-align:center; padding:40px;">
          <h1>🔒 Escanee el QR para abrir el formulario</h1>
          <p>Para evitar reutilizar datos por el botón “Atrás”, el acceso requiere escaneo fresco del QR.</p>
        </div>
        <script>
          // Si alguien vuelve con "Atrás" a esta pantalla, fuerza recarga
          window.addEventListener('pageshow', function (e) {
            if (e.persisted || (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
              location.reload();
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  // Validación mínima: no auto-asignar bloque por defecto si exiges QR
  const bloqueFinal = requireQR ? (bloque || '') : (bloque || '3');

  // ======= FORMULARIO TIPO NACIONAL =========
  if (tipo === 'nacional') {
    let variedades = [];
    if (bloqueFinal === '3') {
      variedades = [
        { value: 'momentum', label: 'Momentum' },
        { value: 'quick sand', label: 'Quick Sand' },
        { value: 'pink floyd', label: 'Pink Floyd' },
        { value: 'freedom', label: 'Freedom' },
      ];
    } else if (bloqueFinal === '4') {
      variedades = [
        { value: 'freedom', label: 'Freedom' },
        { value: 'hilux', label: 'Hilux' },
      ];
    }

    // Si no hay bloque (porque exigimos QR y no vino), muestra aviso
    if (!bloqueFinal) {
      return res.send(`
        <html lang="es">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Falta parámetro</title>
          <link rel="stylesheet" type="text/css" href="/style.css"/>
          <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
          <meta http-equiv="Pragma" content="no-cache"/>
          <meta http-equiv="Expires" content="0"/>
        </head>
        <body class="theme-nacional">
          <div class="form-container" style="text-align:center; padding:40px;">
            <h1>⚠️ Falta el parámetro “bloque”</h1>
            <p>Vuelva a escanear el QR.</p>
          </div>
        </body>
        </html>
      `);
    }

    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Formulario Tallos Nacional</title>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
        <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
        <meta http-equiv="Pragma" content="no-cache"/>
        <meta http-equiv="Expires" content="0"/>
      </head>
      <body class="theme-nacional">
        <div class="form-container">
          <h1 class="title">REGISTRO NACIONAL</h1>
          <h2 class="subtitle">Bloque ${bloqueFinal} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
          <form action="/submit" method="POST" id="nacionalForm" autocomplete="off">
            <label for="bloque">Bloque:</label>
            <p style="font-size: 1.5em; padding: 10px;">${bloqueFinal}</p><br><br>

            <label for="variedad">Variedad:</label>
            <select name="variedad" required autocomplete="off">
              ${variedades.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
            </select><br><br>

            <label for="numero_tallos">Número de tallos:</label>
            <input type="number" name="numero_tallos" required inputmode="numeric" autocomplete="off"><br><br>

            <!-- Campos ocultos -->
            <input type="hidden" name="bloque" value="${bloqueFinal}" />
            <input type="hidden" name="etapa" value="${etapa}" />
            <input type="hidden" name="tipo" value="nacional" />
            ${requireQR && qrOK ? `<input type="hidden" name="qr" value="1" />` : ''}

            <input type="submit" value="Enviar">
          </form>
        </div>

        <script>
          // Si vuelve con "Atrás" (bfcache), fuerza recarga
          window.addEventListener('pageshow', function (e) {
            if (e.persisted || (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
              location.reload();
            }
          });
        </script>
      </body>
      </html>
    `);
  }

  // ======= FORMULARIO ORIGINAL (fin de corte) =========
  let variedades = [];
  let seleccionVariedad = 'momentum';

  if (bloqueFinal === '3') {
    variedades = [
      { value: 'momentum', label: 'Momentum' },
      { value: 'quick sand', label: 'Quick Sand' },
      { value: 'pink floyd', label: 'Pink Floyd' },
      { value: 'freedom', label: 'Freedom' },
    ];
  } else if (bloqueFinal === '4') {
    variedades = [
      { value: 'freedom', label: 'Freedom' },
      { value: 'hilux', label: 'Hilux' },
    ];
    seleccionVariedad = 'freedom';
  }

  if (requireQR && !bloqueFinal) {
    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Falta parámetro</title>
        <link rel="stylesheet" type="text/css" href="/style.css"/>
        <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
        <meta http-equiv="Pragma" content="no-cache"/>
        <meta http-equiv="Expires" content="0"/>
      </head>
      <body class="theme-default">
        <div class="form-container" style="text-align:center; padding:40px;">
          <h1>⚠️ Falta el parámetro “bloque”</h1>
          <p>Vuelva a escanear el QR.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Formulario Fin de Corte / N° Tallos</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
      <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
      <meta http-equiv="Pragma" content="no-cache"/>
      <meta http-equiv="Expires" content="0"/>
    </head>
    <body class="theme-default">
      <div class="form-container">
        <h1>FIN DE CORTE REGISTRO</h1>
        <h2>Registro</h2>
        <h2>Formulario de Registro para</h2>
        <h1>Bloque ${bloqueFinal || '—'} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h1>

        <form action="/submit" method="POST" id="registroForm" autocomplete="off">
          <label for="bloque">Bloque:</label>
          <p style="font-size: 1.5em; padding: 10px;">${bloqueFinal || '—'}</p><br><br>

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect" onchange="mostrarTamano()" value="${seleccionVariedad}" autocomplete="off">
            ${variedades.map(variedad => `
              <option value="${variedad.value}" ${seleccionVariedad === variedad.value ? 'selected' : ''}>${variedad.label}</option>
            `).join('')}
          </select><br><br>

          <label for="tamano">Elija Tamaño:</label>
          <div class="tamano-options" id="tamanoOptions">
            <div class="tamano-option" id="largo" onclick="selectTamano('largo')">Largo</div>
            <div class="tamano-option" id="corto" onclick="selectTamano('corto')">Corto</div>
          </div><br><br>

          <input type="hidden" name="tamano" required />

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required inputmode="numeric" autocomplete="off"><br><br>

          <!-- Campos ocultos -->
          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloqueFinal || ''}" />
          <input type="hidden" name="tipo" value="fin_corte" />
          ${requireQR && qrOK ? `<input type="hidden" name="qr" value="1" />` : ''}

          <input type="submit" value="Enviar" ${requireQR && !bloqueFinal ? 'disabled' : ''}>
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
          }
        }

        // Default UI si la variedad es freedom
        window.onload = function() {
          var variedad = document.getElementById('variedadSelect')?.value;
          if (variedad === 'freedom') {
            selectTamano('largo');
            mostrarTamano();
          }
        };

        // Validación + limpieza básica
        document.getElementById('registroForm').onsubmit = function(e) {
          var tamano = document.querySelector('input[name="tamano"]').value;
          var numeroTallos = document.querySelector('input[name="numero_tallos"]').value.trim();
          document.querySelector('input[name="numero_tallos"]').value = numeroTallos;
          if (!tamano) {
            e.preventDefault();
            alert('Por favor seleccione el tamaño (Largo, Corto o Ruso si Freedom).');
          }
          if (!numeroTallos || isNaN(numeroTallos)) {
            e.preventDefault();
            alert('Por favor ingrese un número de tallos válido.');
          }
        }

        // Si vuelve con "Atrás" (bfcache o back_forward), fuerza recarga => formulario limpio
        window.addEventListener('pageshow', function (e) {
          if (e.persisted || (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
            location.reload();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// ==================== RUTA POST ====================
app.post('/submit', ipWhitelist, async (req, res) => {
  const { variedad, tamano, numero_tallos, etapa, bloque, tipo, qr } = req.body;

  const sanitizedBloque = (bloque || '').replace(/[^0-9]/g, '');
  const sanitizedNumeroTallos = parseInt(numero_tallos, 10);
  const fecha = new Date().toISOString().split('T')[0];

  // (Opcional) Si exiges QR, verifica que venga la marca
  if (process.env.REQUIRE_QR === '1' && qr !== '1') {
    return res.status(400).send('Acceso inválido: re-escanee el QR.');
  }

  const data = {
    fecha,
    bloque: sanitizedBloque,
    variedad,
    numero_tallos: sanitizedNumeroTallos,
    etapa: etapa || '',
    tipo: tipo || '', // nacional o fin_corte
  };

  // Solo agregar tamaño si NO es nacional
  if (tipo !== 'nacional') {
    data.tamaño = tamano;
  }

  console.log('[SUBMIT]', {
    fromIp: getClientIp(req),
    data
  });

  try {
    await addRecord(data);
    // PRG: Post -> Redirect (303) -> Get (pantalla de éxito)
    return res.redirect(303, `/exito?tipo=${encodeURIComponent(tipo || '')}`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Hubo un error al guardar los datos.');
  }
});

// ==================== RUTA DE ÉXITO ====================
app.get('/exito', noStore, (req, res) => {
  const tipo = req.query.tipo || '';
  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Registro exitoso</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
      <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
      <meta http-equiv="Pragma" content="no-cache"/>
      <meta http-equiv="Expires" content="0"/>
    </head>
    <body class="${tipo === 'nacional' ? 'theme-nacional' : 'theme-default'}">
      <div class="form-container" style="text-align:center; padding:40px;">
        <h1>✅ Datos guardados correctamente</h1>
        <p>Tu registro de <strong>${tipo || 'fin_corte'}</strong> fue procesado.</p>
        <p style="margin-top:24px;">
          <button onclick="window.close()" style="padding:12px 16px; border-radius:10px; border:none; cursor:pointer;">Cerrar esta pestaña</button>
        </p>
        <p style="opacity:.8; margin-top:10px;">Si el navegador no permite cerrar automáticamente, puedes cerrar manualmente.</p>
      </div>
      <script>
        // Evita volver a una versión cacheada con "Atrás"
        window.addEventListener('pageshow', function (e) {
          if (e.persisted || (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
            location.reload();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});