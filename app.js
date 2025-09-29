const express = require('express');
const bodyParser = require('body-parser');
const { addRecord } = require('./googleSheets');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ====== IP Whitelist Setup ======
app.set('trust proxy', true); // respeta X-Forwarded-For detrás de proxy/reverse proxy

// Configura IPs permitidas por variable de entorno: ALLOWED_IPS="127.0.0.1,192.168.1.,10.0.0.5"
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '186.102.86.56,186.102.77.146,190.61.45.230,192.168.10.23,192.168.10.1,186.102.62.30,186.102.55.56')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', ''); // normaliza IPv6-mapeado
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

// ==================== RUTA PRINCIPAL ====================
app.get('/', (req, res) => {
  const bloque = req.query.bloque || '3';
  const etapa = req.query.etapa || '';
  const tipo = req.query.tipo || ''; // nacional | fin_corte (default)

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
          <form action="/submit" method="POST">
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
  } else if (bloque === '5'|| bloque === '6') {
    variedades = [
      {value: 'freedom', label:'Freedom'},
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

          <input type="hidden" name="tamano" required />

          <label for="numero_tallos">Número de tallos:</label>
          <input type="number" name="numero_tallos" required><br><br>

          <!-- Campos ocultos -->
          <input type="hidden" name="etapa" value="${etapa}" />
          <input type="hidden" name="bloque" value="${bloque}" />
          <input type="hidden" name="tipo" value="fin_corte" />

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

        window.onload = function() {
          var variedad = document.getElementById('variedadSelect').value;
          if (variedad === 'freedom') {
            selectTamano('largo');
            mostrarTamano();
          }
        };

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

