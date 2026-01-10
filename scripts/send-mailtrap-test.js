// Carga variables de entorno desde .env si existe
require('dotenv').config();

const TOKEN = process.env.MAILTRAP_API_TOKEN || "738c320cee63cafc742dfd7cc09c6ec7";
const rawFrom = process.env.SMTP_FROM || 'hello@demomailtrap.co';
let FROM_EMAIL = 'hello@demomailtrap.co';
let FROM_NAME = process.env.MAIL_FROM_NAME || 'Mailtrap Test';
const TO_EMAIL = process.env.TEST_RECIPIENT || 'cesardelfinr@gmail.com';

// Normaliza `rawFrom` que puede venir como:
// - "Name <email@domain.com>"
// - "email@domain.com"
const angleMatch = String(rawFrom).match(/^\s*"?([^"<]+?)"?\s*<\s*([^>]+)\s*>\s*$/);
if (angleMatch) {
  FROM_NAME = FROM_NAME || angleMatch[1].trim();
  FROM_EMAIL = angleMatch[2].trim();
} else if (String(rawFrom).includes('@')) {
  FROM_EMAIL = String(rawFrom).trim();
} else {
  FROM_EMAIL = 'hello@demomailtrap.co';
}

const payload = {
  from: { email: FROM_EMAIL, name: FROM_NAME },
  to: [{ email: TO_EMAIL }],
  subject: "Esto es una prueba de TIRITO con Mailtrap",
  text: "FELICITACIONES! Si estás leyendo esto, el envío de emails desde Tirito funciona correctamente usando Mailtrap como proveedor SMTP.",
  category: "Integration Test",
};

console.log('Usando FROM:', FROM_NAME, `<${FROM_EMAIL}>`, '→ TO:', TO_EMAIL);

(async () => {
  try {
    const res = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('Error en respuesta Mailtrap:', res.status, res.statusText, json);
      process.exitCode = 2;
      return;
    }

    console.log('Mailtrap API respondió:', json);
  } catch (err) {
    console.error('Error enviando petición a Mailtrap:', err);
    process.exitCode = 1;
  }
})();
