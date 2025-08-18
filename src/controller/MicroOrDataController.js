const axios = require('axios');
const { getPendingORData, getORById, updateORData } = require('../models/MicroOrDateModel');
const { connectToDbc } = require('../../utils/config');


let sessionToken = null;
let sessionDate = null;

async function fetchAccessToken() {
  const today = new Date().toISOString().slice(0, 10);
  if (sessionToken && sessionDate === today) return sessionToken;

  const response = await axios.post(
    'https://idra-ump.com/app/extern/v1/authenticate',
    { client_id: 'national', client_secret: 'wReuzKZy9N' },
    { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
  );

  sessionToken = response.data.access_token;
  sessionDate = today;
  return sessionToken;
}

async function processORData(req, res) {
  let connection;
  try {
    const token = await fetchAccessToken();
    const { rows, connection: conn } = await getPendingORData();
    connection = conn;

    if (!rows || rows.length === 0) return res.json({ message: 'No OR data to process.' });

    const results = [];
    const currentDate = new Date().toISOString().slice(0, 10);

    for (const row of rows) {
      const ORID = row.ORID;
      const orRecord = await getORById(connection, ORID);

      const sendCount = (orRecord.SEND_COUNT || 0) + 1;

      let requestBody = {
        orId: orRecord.ORID,
        orSerialNumber: "",
        policyNumber: orRecord.POLICYNUMBER,
        projectCode: orRecord.PROJECT,
        officeBranchCode: orRecord.OFFICECODE,
        officeBranchName: orRecord.OFFICENAME,
        orType: orRecord.ORTYPE,
        orDate: orRecord.ORDATE,
        dueDate: orRecord.DUEDATE,
        fromInstallment: orRecord.FROMINSTALLMENT,
        toInstallment: orRecord.TOINSTALLMENT,
        premiumUnitAmount: orRecord.PREMIUMUNITAMOUNT,
        totalPremiumAmount: orRecord.TOTALPREMIUP,
        lateFee: orRecord.LATEFEE,
        suspenseAmount: orRecord.SUSPENSE,
        others: orRecord.OTHERS,
        totalPayableAmount: orRecord.TOTALPAYABLEAMOUNT,
        modeOfPayment: orRecord.MODEOFPAYMENT,
        paymentDetail: "",
        prId: orRecord.PRID,
        prDate: orRecord.PRDATE,
        nextPremiumDueDate: orRecord.NEXTPREMIUMDUEDATE,
        totalPremiumPaidSoFar: orRecord.TOTALPREMIUMPAIDSOFAR,
        premiumMode: orRecord.PREMIUMMODE,
        depositDate: "",
        depositedToBank: "",
        depositedToBranch: "",
        depositedToAccountNumber: "",
        mfs: "",
        mfsAccountNumber: "",
        agentName: orRecord.AGENTNAME,
        agentId: orRecord.AGENTID,
        productCode: orRecord.PRODUCTCODE,
        riskStartDate: orRecord.RISKSTARTDATE,
        dateOfBirth: orRecord.DATEOFBIRTH,
      };

      try {
        const response = await axios.post(
          'https://idra-ump.com/app/extern/v1/original-receipt',
          requestBody,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = response.data;
        const trackingId = data.orTrackingId || '';
        const status = data.status || '';
        const code = data.code || '';
        const message = data.message || '';
        const url = data.url || '';

        await updateORData(connection, ORID, {
          trackingId, code, status, message, url, sendCount, currentDate
        });

        results.push({ ORID, status: 'Sent', response: data });
        console.log(`✅ ORID ${ORID} processed successfully.`);
      } catch (err) {
        results.push({ ORID, status: 'Failed', error: err.message });
        console.error(`❌ ORID ${ORID} failed: ${err.message}`);
      }
    }

    res.json({ message: 'OR data processing completed.', results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error('Failed to close connection', e); }
    }
  }
}

module.exports = { processORData };
