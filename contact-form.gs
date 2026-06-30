/**
 * Kineviz contact form backend (Google Apps Script).
 *
 * SETUP
 * 1. Create a new Google Sheet (this will store submissions).
 * 2. In that Sheet: Extensions → Apps Script.
 * 3. Delete the default code, paste this whole file, Save.
 * 4. Deploy → New deployment → type "Web app".
 *      - Description: contact form
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Deploy, authorize when prompted, and COPY the Web app URL
 *    (it ends in /exec). Send that URL back to wire up the form.
 *
 * Because this script is bound to the Sheet, it writes to that Sheet
 * automatically — no Sheet ID needed.
 */

var NOTIFY_EMAIL = 'hello@kineviz.com'; // set to '' to disable email notifications
var SHEET_NAME = 'Submissions';
var HEADERS = ['Timestamp', 'First Name', 'Last Name', 'Email', 'Company', 'Role', 'Use Case / Industry', 'Message', 'Page'];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Bot protection: honeypot field must be empty, and the form must not be
    // submitted implausibly fast. Accept silently (ok:true) so bots think they
    // succeeded — but don't store the row or send email.
    if ((p._hp && p._hp.length) || (p._elapsed && Number(p._elapsed) < 1500)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    sheet.appendRow([
      new Date(),
      p.firstName || '',
      p.lastName || '',
      p.email || '',
      p.company || '',
      p.role || '',
      p.useCase || '',
      p.message || '',
      p.pageUrl || ''
    ]);

    if (NOTIFY_EMAIL) {
      var name = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
      var body =
        'New contact form submission\n\n' +
        'Name: ' + name + '\n' +
        'Email: ' + (p.email || '') + '\n' +
        'Company: ' + (p.company || '') + '\n' +
        'Role: ' + (p.role || '') + '\n' +
        'Use Case / Industry: ' + (p.useCase || '') + '\n\n' +
        'What are you trying to accomplish?\n' + (p.message || '') + '\n\n' +
        'Submitted from: ' + (p.pageUrl || '');
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: p.email || NOTIFY_EMAIL,
        subject: 'New contact form submission' + (name ? ' — ' + name : ''),
        body: body
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Lets you open the /exec URL in a browser to confirm the deployment is live.
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'kineviz-contact-form' }))
    .setMimeType(ContentService.MimeType.JSON);
}
