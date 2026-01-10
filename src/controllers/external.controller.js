const https = require('https');
const cache = require('../utils/simpleCache');

// GET /api/external/cedula/:cedula
const cedulaLookup = (req, res, next) => {
  try {
    const { cedula } = req.params; // expected like V12345678
    if (!cedula) return res.status(400).json({ message: 'Cedula requerida' });

    // Check cache first
    const cached = cache.get(cedula);
    if (cached) return res.json(cached);

    // Usar fuente alternativa más fiable (proporcionada por el usuario)
    const url = `https://www.armandodata.com/Personas/Detalles?cedula=${encodeURIComponent(cedula)}`;

    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => {
        // Heurística más robusta para extraer nombre y apellido desde HTML
        let firstName = '';
        let lastName = '';

        // 1) Buscar etiquetas comunes con contenido: <h1>, <h2>, <strong>, <b>
        const tagMatch = data.match(/<(?:h1|h2|strong|b)[^>]*>([^<]{2,80})<\/(?:h1|h2|strong|b)>/i);
        if (tagMatch) {
          const text = tagMatch[1].replace(/\s+/g, ' ').trim();
          const parts = text.split(' ');
          if (parts.length >= 2) {
            firstName = parts.slice(0, parts.length - 1).join(' ');
            lastName = parts.slice(parts.length - 1).join(' ');
          }
        }

        // 2) Buscar labels explícitos "Nombre" / "Nombres" / "Apellidos"
        if (!firstName) {
          const nombreMatch = data.match(/Nombre[s]?:\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\-\s]+)/i);
          if (nombreMatch) firstName = nombreMatch[1].trim();
        }
        if (!lastName) {
          const apellidoMatch = data.match(/Apellido[s]?:\s*([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\-\s]+)/i);
          if (apellidoMatch) lastName = apellidoMatch[1].trim();
        }

        // 3) Si aún no hay, fallback a heurística: buscar la primera ocurrencia de dos palabras capitalizadas
        if (!firstName || !lastName) {
          const nameMatch = data.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,})\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,})(?:\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}))?/);
          if (nameMatch) {
            firstName = firstName || nameMatch[1] + (nameMatch[3] ? ' ' + nameMatch[3] : '');
            lastName = lastName || nameMatch[2];
          }
        }

        const result = { firstName: firstName || '', lastName: lastName || '', id: cedula, raw: data };
        // Cache result for 2 minutes
        cache.set(cedula, result, 120_000);
        res.json(result);
      });
    }).on('error', (err) => {
      next(err);
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cedulaLookup
};
