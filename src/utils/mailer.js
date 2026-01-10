const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const {
  MAIL_PROVIDER, // 'sendgrid' or 'smtp' or 'mailtrap'
  SENDGRID_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  MAILTRAP_API_TOKEN
} = process.env;

let sendgrid = null;
let nodemailerTransporter = null;
let handlebars = null;
let mailtrapAvailable = false;
let mailtrapSend = null;

// Try load handlebars for templates
try {
  handlebars = require('handlebars');
} catch (e) {
  // optional; we'll fallback to raw html/text
  handlebars = null;
}

// Init provider clients lazily
if (MAIL_PROVIDER === 'sendgrid' && SENDGRID_API_KEY) {
  try {
    sendgrid = require('@sendgrid/mail');
    sendgrid.setApiKey(SENDGRID_API_KEY);
  } catch (e) {
    logger.warn('sendgrid SDK not installed or failed to init; falling back to other providers');
    sendgrid = null;
  }
}

if ((MAIL_PROVIDER === 'smtp' || !MAIL_PROVIDER) && SMTP_HOST && SMTP_PORT) {
  try {
    const nodemailer = require('nodemailer');
    nodemailerTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });
  } catch (e) {
    logger.warn('nodemailer not available; will fallback to logs');
    nodemailerTransporter = null;
  }
}

// Support Mailtrap HTTP API when MAIL_PROVIDER === 'mailtrap' and token provided
if (MAIL_PROVIDER === 'mailtrap' && MAILTRAP_API_TOKEN) {
  const fetch = globalThis.fetch || require('node-fetch');
  mailtrapAvailable = true;
  mailtrapSend = async ({ to, subject, text, html }) => {
    const payload = {
      from: { email: SMTP_FROM || 'hello@demomailtrap.co', name: 'Tirito App' },
      to: Array.isArray(to) ? to.map(t => (typeof t === 'string' ? { email: t } : t)) : [{ email: to }],
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || undefined,
      category: 'transactional'
    };

    const res = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILTRAP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const err = new Error(`Mailtrap API error: ${res.status} ${res.statusText}`);
      err.response = json;
      throw err;
    }

    return res.json();
  };
}

function renderTemplate(templateName, data) {
  try {
    const tplPath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(tplPath)) return null;
    const source = fs.readFileSync(tplPath, 'utf-8');
    if (!handlebars) return source;
    const template = handlebars.compile(source);
    return template(data);
  } catch (e) {
    logger.error('Error rendering email template', e);
    return null;
  }
}

async function sendMail({ to, subject, template, templateData, text, html }) {
  // If template provided, render html and text
  if (template) {
    const rendered = renderTemplate(template, templateData || {});
    if (rendered) html = rendered;
  }

  // If configured, prefer Mailtrap HTTP API
  if (mailtrapAvailable && MAIL_PROVIDER === 'mailtrap' && mailtrapSend) {
    try {
      return await mailtrapSend({ to, subject, text, html });
    } catch (e) {
      logger.error('Mailtrap transport failed, falling back:', e);
      // fall through to other transports
    }
  }

  // Prefer provider selection: SendGrid -> SMTP -> log
  if (sendgrid) {
    const msg = {
      to,
      from: SMTP_FROM || 'no-reply@tirito.app',
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || undefined
    };
    try {
      return await sendgrid.send(msg);
    } catch (e) {
      logger.error('SendGrid send failed:', e);
      // fallthrough to smtp/log
    }
  }

  if (nodemailerTransporter) {
    const mailOptions = {
      from: SMTP_FROM || 'no-reply@tirito.app',
      to,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || undefined
    };
    try {
      return await nodemailerTransporter.sendMail(mailOptions);
    } catch (e) {
      logger.error('Nodemailer send failed:', e);
      // fallthrough to log
    }
  }

  // Final fallback: log the message (useful for dev)
  logger.info(`[mail-fallback] to=${to} subject=${subject} text=${text || ''} html=${html ? '(html)' : ''}`);
  return Promise.resolve();
}

module.exports = { sendMail, renderTemplate };
