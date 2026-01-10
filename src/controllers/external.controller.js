const https = require('https');
const cache = require('../utils/simpleCache');
const cheerio = require('cheerio');

// GET /api/external/cedula/:cedula
const cedulaLookup = (req, res, next) => {
  try {
    const { cedula } = req.params; // expected like V12345678
    if (!cedula) return res.status(400).json({ message: 'Cedula requerida' });
    const cedulaKey = String(cedula).toUpperCase().replace(/\s+/g, '');
    // Validación básica: formato V or E seguido de 6-9 dígitos
    if (!/^[VE]\d{6,9}$/.test(cedulaKey)) return res.status(400).json({ message: 'Formato de cédula inválido' });

    // Check cache first (normalized key)
    const cached = cache.get(cedulaKey);
    if (cached) return res.json(cached);

    // Usar fuente alternativa más fiable (proporcionada por el usuario)
    const url = `https://www.armandodata.com/Personas/Detalles?cedula=${encodeURIComponent(cedulaKey)}`;

    const options = new URL(url);
    options.method = 'GET';
    options.headers = {
      'User-Agent': 'TiritoApp-Backend/1.0 (+https://example.local)',
      'Accept': 'text/html,application/xhtml+xml'
    };

    const reqExternal = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => {
        // Parse HTML safely with cheerio
        let firstName = '';
        let lastName = '';
        try {
          const $ = cheerio.load(data);

          // 1) Buscar el bloque 'Nombre Completo' y su <p class="info-card-text">
          let full = '';
          const titleEls = $('h5.info-card-title').toArray();
          for (let i = 0; i < titleEls.length; i++) {
            const el = titleEls[i];
            const txt = $(el).text().trim();
            if (/nombre completo/i.test(txt)) {
              // intentar obtener el siguiente <p class="info-card-text">
              full = $(el).next('p.info-card-text').text().trim() || $(el).siblings('p.info-card-text').first().text().trim();
              if (full) break;
            }
          }

          // 2) Fallback: elemento p con clase display-6 (visto en la página)
          if (!full) full = $('p.info-card-text.display-6').first().text().trim();

          // 3) Otro fallback: <title>
          if (!full) {
            const title = $('title').text().trim();
            const m = title.match(/Detalle de Persona:\s*([^:]+)\s*CI/i);
            if (m) full = m[1].trim();
          }

          if (full) {
            const parts = full.replace(/\s+/g, ' ').split(' ');
            if (parts.length === 1) {
              firstName = parts[0];
            } else if (parts.length === 2) {
              firstName = parts[0];
              lastName = parts[1];
            } else {
              // Asumir últimas 2 palabras como apellidos cuando hay >=3 palabras
              lastName = parts.slice(-2).join(' ');
              firstName = parts.slice(0, -2).join(' ');
            }
          }
        } catch (e) {
          // silenciosamente ignora parse errors y deja que otras heurísticas manejen
        }

        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        const result = { firstName: firstName || '', lastName: lastName || '', fullName: fullName || '', id: cedulaKey };
        // Include raw HTML only when explicitly requested (debug=1)
        const includeRaw = req.query && (req.query.debug === '1' || req.query.debug === 'true');
        if (includeRaw) {
          // limit raw size to avoid huge responses
          result.raw = (typeof data === 'string') ? data.slice(0, 200000) : '';
        }

        // Cache result for 2 minutes (cache key uses normalized cedula)
        cache.set(cedulaKey, result, 120_000);
        res.json(result);
      });
    });

    // timeout and error handling
    reqExternal.setTimeout(7000, () => {
      reqExternal.abort();
      return next(new Error('Timeout al consultar fuente externa'));
    });
    reqExternal.on('error', (err) => {
      return next(err);
    });
    reqExternal.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cedulaLookup
};
