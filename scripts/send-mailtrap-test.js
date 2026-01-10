// Envío por la API HTTP de Mailtrap (no requiere paquete adicional).
// Usa el token de la cuenta Mailtrap que el usuario proporcionó.
const TOKEN = "738c320cee63cafc742dfd7cc09c6ec7";

const payload = {
  from: { email: "hello@demomailtrap.co", name: "Mailtrap Test" },
  to: [{ email: "cesardelfinr@gmail.com" }],
  subject: "You are awesome!",
  text: "Congrats for sending test email with Mailtrap!",
  category: "Integration Test",
};

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
