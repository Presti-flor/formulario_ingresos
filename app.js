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

/** ================== Reglas de tamaño ================== */
function allowedSizes(variedad, bloque) {
  const v = (variedad || '').toLowerCase().trim();
  const b = String(bloque || '').trim();
  if (v === 'freedom') return ['largo', 'corto', 'ruso'];
  if (v === 'vendela' && b === '1') return ['ruso', 'na'];
  return [];
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
        <style>
          body.theme-nacional-blue {
            background: linear-gradient(120deg, #001f3f, #0074D9);
            color: #fff;
            font-family: 'Poppins', sans-serif;
          }
          .form-container {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(6px);
            padding: 2em;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            margin: 40px auto;
            box-shadow: 0 0 15px rgba(0,0,0,0.3);
          }
          input, select {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          input[type=submit] {
            background: #fff;
            color: #0074D9;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s ease;
          }
          input[type=submit]:hover {
            background: #0074D9;
            color: #fff;
          }
        </style>
      </head>
      <body class="theme-nacional-blue">
        <div class="form-container">
          <h1 class="title">REGISTRO NACIONAL</h1>
          <h2 class="subtitle">Bloque ${bloque} ${etapa ? `- Etapa: ${etapa.charAt(0).toUpperCase() + etapa.slice(1)}` : ''}</h2>
          <form action="/submit" method="POST">
            <label for="bloque">Bloque:</label>
            <p style="font-size: 1.5em; padding: 10px;">${bloque}</p>

            <label for="variedad">Variedad:</label>
            <select name="variedad" required>
              ${variedades.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
            </select>

            <label for="numero_tallos">Número de tallos:</label>
            <input type="number" name="numero_tallos" required>

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
      <title>Formulario Fin de Corte</title>
      <link rel="stylesheet" type="text/css" href="/style.css"/>
      <style>
        .tamano-options { display:flex; gap:8px; flex-wrap:wrap; }
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
          <p style="font-size: 1.5em; padding: 10px;">${bloque}</p>

          <label for="variedad">Variedad:</label>
          <select name="variedad" required id="variedadSelect">
            ${variedades.map(v => `<option value="${v.value}" ${v.value===seleccionVariedad?'selected':''}>${v.label}</option>`).join('')}
          </select><br>

          <div id="tamanoSection" class="hidden">
            <label for="tamano">Elija Tamaño:</label>
            <div class="tamano-options" id="tamanoOptions"></div>
            <input type="hidden" name="tamano" />
          </div><br>

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br>

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
          if (v === 'vendela' && b === '1') return ['ruso','na'];
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
            div.textContent = t.toUpperCase();
            div.onclick = function(){
              document.querySelectorAll('.tamano-option').forEach(x => x.classList.remove('selected'));
              div.classList.add('selected');
              hiddenInput.value = t;
            };
            container.appendChild(div);
          });

          container.querySelector('.tamano-option')?.click();
        }

        document.getElementById('variedadSelect').addEventListener('change', renderSizeOptions);
        window.onload = renderSizeOptions;

        document.getElementById('registroForm').onsubmit = function(e){
          const num = document.querySelector('input[name="numero_tallos"]').value.trim();
          if(!num || isNaN(num)){ e.preventDefault(); alert('Número inválido.'); return; }
          const visible = !document.getElementById('tamanoSection').classList.contains('hidden');
          if(visible && !document.querySelector('input[name="tamano"]').value){
            e.preventDefault(); alert('Seleccione tamaño.');
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
    tipo: tipo || '',
  };

  if (tipo !== 'nacional' && isSizeAllowed(variedad, sanitizedBloque, tamano)) {
    data.tamaño = tamano.toLowerCase();
  }

  console.log('[SUBMIT]', { fromIp: getClientIp(req), data });

  try {
    await addRecord(data);
    res.send(`<html><body style="text-align:center;margin-top:40px;font-family:sans-serif;">
      <h1>✅ Datos guardados correctamente</h1></body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Hubo un error al guardar los datos.');
  }
});

// ==================== INICIO SERVIDOR ====================
app.listen(port, () => console.log(`Servidor activo en http://localhost:${port}`));