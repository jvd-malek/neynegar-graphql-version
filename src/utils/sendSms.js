const request = require('request');

/**
 * Send SMS via ippanel pattern API
 * @param {Object} params
 * @param {string} params.to - destination phone number (09XXXXXXXXX)
 * @param {string} params.patternCode - ippanel pattern code
 * @param {Array<Object>} params.inputData - inputData array for pattern
 * @returns {Promise<void>}
 */
function sendSms({ to, patternCode, inputData }) {
  return new Promise((resolve, reject) => {
    request.post({
      url: "http://ippanel.com/api/select",
      body: {
        op: "pattern",
        user: process.env.SMS_USERNAME || "u09960025507",
        pass: process.env.SMS_PASSWORD || "Faraz@1834690023902711",
        fromNum: process.env.SMS_FROM || "3000505",
        toNum: to,
        patternCode,
        inputData
      },
      json: true
    }, (err, res, body) => {
      if (err) {
        console.error('SMS Error:', err);
        return reject(err);
      }
      console.log('SMS sent:', body);
      resolve();
    });
  });
}

module.exports = sendSms;


