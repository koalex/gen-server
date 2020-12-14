const config = require('config');
const nodemailer = require('nodemailer');
const disposable = require('disposable-email');
const isEmail = require('../utils/isEmail');

const transporters = Object.entries(config.nodemailer.transporters).reduce((acc, v) => {
  acc[v[0]] = nodemailer.createTransport(v[1]);
  const transporter = acc[v[0]];
  const sendMailOriginal = transporter.sendMail;

  transporter.sendMail = async function sendMail({to, subject, text, html, attachments, ...rest}) {
    const from = v[1].auth.user;
    if (Array.isArray(to)) {
      to = to.filter(email => (disposable.validate(email) && isEmail(email))).join(', ');
    } else {
      if (!disposable.validate(to)) return false;

      if (!isEmail(to)) throw new Error('WRONG_EMAIL');
    }

    if (!to) throw new Error('EMAIL_REQUIRED');

    // setup email data with unicode symbols
    const mailOptions = {
      from,
      to,
      subject,
      text,
      ...rest
    };

    if (html) mailOptions.html = html;

    if (attachments && Array.isArray(attachments)) mailOptions.attachments = attachments;

    return await sendMailOriginal.call(transporter, mailOptions); // { messageId, accepted: [кто получил], rejected: [кто НЕ получил] }
  }

  return acc;
}, {});

module.exports = transporters;
