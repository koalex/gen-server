'use strict';

const config     = require('config');
const nodemailer = require('nodemailer');
const disposable = require('disposable-email');
const isEmail    = require('../utils/isEmail');

// Memory leak warning! When using readable streams as content and sending fails then Nodemailer does not abort
// the already opened but not yet finished stream, you need to do this yourself.
// Nodemailer only closes the streams it has opened itself (eg. file paths, URLs)
let transporter = nodemailer.createTransport({
    service: config.nodemailer.service,
    host: config.nodemailer.host,
    port: config.nodemailer.port,
    secure: config.nodemailer.secure,
    auth: config.nodemailer.auth
});

// See options on https://nodemailer.com/message
module.exports = ({ from, to, subject, text, html, attachments, ...rest }) => {
    return new Promise((resolve, reject) => {
        if (Array.isArray(to)) {
            to = to.filter(email => (disposable.validate(email) && isEmail(email))).join(', ');
        } else {
            if (!disposable.validate(to)) return false;

            if (!isEmail(to)) return reject({ message: 'WRONG_EMAIL' });
        }

        if (!to) return reject({ message: 'EMAIL_REQUIRED' });

        // setup email data with unicode symbols
        let mailOptions = {
            from: from,
            to: to,
            subject: subject,
            text: text,
            html: html,
            ...rest
        };

        if (attachments && Array.isArray(attachments)) mailOptions.attachments = attachments;

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve({ messageId: info.messageId, response: info.response })
            }
        });
    });
};
