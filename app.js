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

// ==================== PÁGINA PRINCIPAL ====================
app.get('/', (req, res) => {
  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Inicio</title>
    </head>
    <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
      <h1>Formulario de Registro</h1>
      <p>Abra el formulario en una ventana emergente para registrar tallos.</p>
      <button onclick="abrirPopup()">Abrir Formulario</button>

      <script>
        function abrirPopup() {
          window.open('/form?tipo=nacional&bloque=3', 'formulario',
            'width=600,height=600,resizable=yes,scrollbars=yes');
        }
      </script>
    </body>
    </html>
  `);
});

// ==================== FORMULARIO ====================
app.get('/form', (req, res) => {
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
    }

    return res.send(`
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Formulario Tallos Nacional</title>
      </head>
      <body style="font-family:sans-serif; margin:20px;">
        <h1>REGISTRO NACIONAL</h1>
        <h2>Bloque ${bloque} ${etapa ? `- Etapa: ${etapa}` : ''}</h2>
        <form action="/submit" method="POST">
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
      </body>
      </html>
    `);
  }

  // ======= FORMULARIO FIN DE CORTE =========
  res.send(`
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Formulario Fin de Corte</title>
    </head>
    <body style="font-family:sans-serif; margin:20px;">
      <h1>FIN DE CORTE - BLOQUE ${bloque}</h1>
      <form action="/submit" method="POST" id="registroForm">
        <label for="variedad">Variedad:</label>
        <select name="variedad" required>
          <option value="momentum">Momentum</option>
          <option value="freedom">Freedom</option>
        </select><br><br>

        <label for="tamano">Tamaño:</label>
        <select name="tamano" required>
          <option value="largo">Largo</option>
          <option value="corto">Corto</option>
          <option value="ruso">Ruso</option>
        </select><br><br>

        <label for="numero_tallos">Número de tallos:</label>
        <input type="number" name="numero_tallos" required><br><br>

        <!-- Campos ocultos -->
        <input type="hidden" name="bloque" value="${bloque}" />
        <input type="hidden" name="etapa" value="${etapa}" />
        <input type="hidden" name="tipo" value="fin_corte" />

        <input type="submit" value="Enviar">
      </form>
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
        <button onclick="window.close()" 
                style="margin-top:20px; padding:10px 20px; font-size:16px; cursor:pointer;">
          Cerrar pestaña
        </button>
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