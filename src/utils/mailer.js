const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const {
  MAIL_PROVIDER, // 'sendgrid' or 'smtp' or 'log'
  SENDGRID_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

let sendgrid = null;
let nodemailerTransporter = null;
let handlebars = null;

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
