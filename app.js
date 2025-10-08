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

// Configura IPs permitidas por variable de entorno
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '186.102.35.116,186.102.83.175,186.102.86.56,186.102.77.146,190.61.45.230,192.168.10.23,192.168.10.1,186.102.62.30,186.102.55.56')
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

/** ================== Reglas de tamaño (back y front deben coincidir) ================== */
function allowedSizes(variedad, bloque) {
  const v = (variedad || '').toLowerCase().trim();
  const b = String(bloque || '').trim();
  if (v === 'freedom') return ['largo', 'corto', 'ruso'];
  if (v === 'vendela' && b === '1') return ['ruso'];
  return []; // en cualquier otro caso, sin tamaño
}

function isSizeAllowed(variedad, bloque, tamano) {
  const t = (tamano || '').toLowerCase().trim();
  return allowedSizes(variedad, bloque).includes(t);
}

// ==================== RUTA PRINCIPAL ====================
app.get('/', (req, res) => {
  const bloque = req.query.bloque || '3';
  const etapa = req.query.etapa || '';
  const tipo = req.query.tipo || '';

  // ======= FORMULARIO TIPO NACIONAL (nunca pide tamaño) =========
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
    } else if (bloque === '5' || bloque === '6') {
      variedades = [{ value: 'freedom', label: 'Freedom' }];
    } else if (bloque === '7') {
      variedades = [
        { value: 'candlelight', label: 'Candlelight' },
        { value: 'deep purple', label: 'Deep Purple' },
      ];
    } else if (bloque === '8') {
      variedades = [
        { value: 'star platinum', label: 'Star Platinum' },
        { value: 'candlelight', label: 'Candlelight' },
        { value: 'sommersand', label: 'Sommersand' },
        { value: 'freedom', label: 'Freedom' },
      ];
    } else if (bloque === '1') {
      variedades = [
        { value: 'vendela', label: 'Vendela' },
        { value: 'pink floyd', label: 'Pink Floyd' },
      ];
    } else if (bloque === '2') {
      variedades = [
        { value: 'coral reff', label: 'Coral Reff' },
        { value: 'hummer', label: 'Hummer' },
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
          <form action="/submit" method="POST">
            <label for="bloque">Bloque:</label>
            <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br>

            <label for="variedad">Variedad:</label>
            <select name="variedad" required>
              ${variedades.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
            </select><br><br>

            <label for="numero_tallos">Número de tallos:</label>
            <input type="number" name="numero_tallos" required><br><br>

            <input type="hidden" name="bloque" value="${bloque}" />
            <input type="hidden" name="etapa" value="${etapa}" />
            <input type="hidden" name="tipo" value="nacional" />

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
  } else if (bloque === '5' || bloque === '6') {
    variedades = [{ value: 'freedom', label: 'Freedom' }];
    seleccionVariedad = 'freedom';
  } else if (bloque === '7') {
    variedades = [
      { value: 'candlelight', label: 'Candlelight' },
      { value: 'deep purple', label: 'Deep Purple' },
    ];
    seleccionVariedad = 'candlelight';
  } else if (bloque === '8') {
    variedades = [
      { value: 'star platinum', label: 'Star Platinum' },
      { value: 'candlelight', label: 'Candlelight' },
      { value: 'sommersand', label: 'Sommersand' },
      { value: 'freedom', label: 'Freedom' },
    ];
    seleccionVariedad = 'star platinum';
  } else if (bloque === '1') {
    variedades = [
      { value: 'vendela', label: 'Vendela' },
      { value: 'pink floyd', label: 'Pink Floyd' },
    ];
    seleccionVariedad = 'vendela';
  } else if (bloque === '2') {
    variedades = [
      { value: 'coral reff', label: 'Coral Reff' },
      { value: 'hummer', label: 'Hummer' },
    ];
    seleccionVariedad = 'coral reff';
  }

  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Formulario Fin de Corte / N° Tallos</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
      <style>
        .tamano-options { display:flex; gap:8px; }
        .tamano-option { padding:8px 12px; border:1px solid #999; border-radius:6px; cursor:pointer; user-select:none; }
        .tamano-option.selected { border-color:#007bff; box-shadow:0 0 0 2px rgba(0,123,255,.2); }
        .hidden { display:none !important; }
      </style>
    </head>
    <body class="theme-default">
      <div class="form-container">
        <h1>FIN DE CORTE REGISTRO</h1>
        <h2>Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>

        <form action="/submit" method="POST" id="registroForm">
          <label for="bloque">Bloque:</label>
          <p style="font-size: 1.5em; padding: 10px;">${bloque}</p><br><br>

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect">
            ${variedades.map(variedad => `
              <option value="${variedad.value}" ${seleccionVariedad === variedad.value ? 'selected' : ''}>${variedad.label}</option>
            `).join('')}
          </select><br><br>

          <!-- Sección tamaño: aparece SOLO si la combinación lo permite -->
          <div id="tamanoSection" class="hidden">
            <label for="tamano">Elija Tamaño:</label>
            <div class="tamano-options" id="tamanoOptions"></div>
            <input type="hidden" name="tamano" />
            <br><br>
          </div>

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br><br>

          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloque}" />
          <input type="hidden" name="tipo" value="fin_corte" />

          <input type="submit" value="Enviar">
        </form>
      </div>

      <script>
        function allowedSizes(variedad, bloque){
          const v = (variedad || '').toLowerCase().trim();
          const b = String(bloque || '').trim();
          if (v === 'freedom') return ['largo','corto','ruso'];
          if (v === 'vendela' && b === '1') return ['ruso'];
          return [];
        }

        function renderSizeOptions(){
          const variedad = document.getElementById('variedadSelect').value;
          const bloque = '${bloque}';
          const opts = allowedSizes(variedad, bloque);

          const section = document.getElementById('tamanoSection');
          const container = document.getElementById('tamanoOptions');
          const hiddenInput = document.querySelector('input[name="tamano"]');

          container.innerHTML = '';
          hiddenInput.value = '';

          if (opts.length === 0){
            section.classList.add('hidden');
            return;
          }

          section.classList.remove('hidden');
          opts.forEach(t => {
            const div = document.createElement('div');
            div.className = 'tamano-option';
            div.id = 'opt-' + t;
            div.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            div.onclick = function(){
              document.querySelectorAll('.tamano-option').forEach(x => x.classList.remove('selected'));
              div.classList.add('selected');
              hiddenInput.value = t;
            };
            container.appendChild(div);
          });

          // Selección por defecto
          const first = container.querySelector('.tamano-option');
          if (first){ first.click(); }
        }

        document.getElementById('variedadSelect').addEventListener('change', renderSizeOptions);

        window.onload = function(){
          renderSizeOptions();
        };

        document.getElementById('registroForm').onsubmit = function(e) {
          const numeroInput = document.querySelector('input[name="numero_tallos"]');
          const numeroTallos = String(numeroInput.value || '').trim();
          numeroInput.value = numeroTallos;

          if (!numeroTallos || isNaN(Number(numeroTallos))) {
            e.preventDefault();
            alert('Por favor ingrese un número de tallos válido.');
            return false;
          }

          const tamanoSectionVisible = !document.getElementById('tamanoSection').classList.contains('hidden');
          if (tamanoSectionVisible){
            const tamano = document.querySelector('input[name="tamano"]').value;
            if (!tamano){
              e.preventDefault();
              alert('Por favor seleccione el tamaño.');
              return false;
            }
          }
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

  const data = {
    fecha,
    bloque: sanitizedBloque,
    variedad,
    numero_tallos: sanitizedNumeroTallos,
    etapa: etapa || '',
    tipo: tipo || '', // nacional o fin_corte
  };

  // Solo incluir tamaño si la combinación lo permite (regla de negocio)
  if (tipo !== 'nacional' && isSizeAllowed(variedad, sanitizedBloque, tamano)) {
    data.tamaño = String(tamano).toLowerCase();
  }

  console.log('[SUBMIT]', {
    fromIp: getClientIp(req),
    data
  });

  try {
    await addRecord(data);
    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1>✅ Datos guardados correctamente</h1>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send('Hubo un error al guardar los datos.');
  }
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});