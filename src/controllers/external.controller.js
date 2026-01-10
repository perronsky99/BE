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
            const parts = full.replace(/\s+/g, ' ').trim().split(' ');
            // partículas comunes que forman parte del apellido compuesto
            const particles = ['DE','DEL','LA','LAS','LOS','Y','VAN','VON','MC','MAC','SAN','SANTA'];
            if (parts.length === 1) {
              firstName = parts[0];
            } else if (parts.length === 2) {
              firstName = parts[0];
              lastName = parts[1];
            } else {
              // Por defecto tomar las últimas 2 palabras como apellido
              let lastParts = parts.slice(-2);
              // Si la palabra anterior a esas es una partícula, incluirla
              const maybeParticle = parts[parts.length - 3] ? parts[parts.length - 3].toUpperCase() : '';
              if (particles.includes(maybeParticle)) {
                lastParts = parts.slice(-3);
              }
              lastName = lastParts.join(' ');
              firstName = parts.slice(0, parts.length - lastParts.length).join(' ');
            }
          }
        } catch (e) {
          // silenciosamente ignora parse errors y deja que otras heurísticas manejen
        }

        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        // Extract birthDate and gender if present in the page
        let birthDate = '';
        let gender = '';
        try {
          const $ = cheerio.load(data);
          // Fecha de Nacimiento
          const birthEl = $('h5.info-card-title').filter((i, el) => /fecha de nacimiento/i.test($(el).text())).first();
          if (birthEl && birthEl.length) {
            const txt = $(birthEl).next('p.info-card-text').text().trim() || '';
            // expected like '17-09-1985 (40)'
            const m = txt.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/);
            if (m) {
              const [d, mth, y] = m[1].split(/[-\/]/);
              // normalize to YYYY-MM-DD
              birthDate = `${y}-${String(mth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            }
          }
          // Género
          const genEl = $('h5.info-card-title').filter((i, el) => /género|genero/i.test($(el).text())).first();
          if (genEl && genEl.length) {
            const gtxt = $(genEl).next('p.info-card-text').text().trim();
            if (gtxt) {
              gender = gtxt.toUpperCase();
            }
          }
        } catch (e) {
          // ignore
        }

        const result = { firstName: firstName || '', lastName: lastName || '', fullName: fullName || '', id: cedulaKey, birthDate: birthDate || '', gender: gender || '' };
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
