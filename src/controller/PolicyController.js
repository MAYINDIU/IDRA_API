const axios = require('axios');
const { getPendingPolicies, updatePolicyStatus } = require('../models/PolicyModel');

const BATCH_SIZE = 500;
const DELAY_BETWEEN_REQUESTS_MS = 1000;  // 1 second between each item
const RETRY_LIMIT = 5;
const RETRY_DELAY_MS = 10000;            // 10 seconds wait on 429

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const v = (value) => (value === undefined || value === null || value === '') ? null : value;

async function processRow(conn, row, access_token) {
  const payload = {
    policyNumber: v(row.POLICYNUMBER),
    projectCode: v(row.PROJECTCODE),
    policyHolderName: v(row.POLICYHOLDERNAME),
    dateOfBirth: v(row.DATEOFBIRTH),
    policyStartDate: v(row.POLICYSTARTDATE),
    policyEndDate: v(row.POLICYENDDATE),
    riskStartDate: v(row.RISKSTARTDATE),
    term: v(row.TERM),
    assuredSum: v(row.ASSUREDSUM),
    totalPremium: v(row.TOTALPREMIUM),
    noOfPaidInstallment: v(row.NOOFPAIDINSTALLMENT),
    totalPaidAmount: v(row.TOTALPAIDAMOUNT),
    status: null,
    email: v(row.EMAIL),
    address: v(row.ADDRESS),
    postalCode: v(row.POSTALCODE),
    district: v(row.DISTRICT),
    gender: v(row.GENDER),
    mobileNumber: v(row.MOBILENUMBER),
    policyType: v(row.POLICYTYPE),
    productName: v(row.PRODUCTNAME),
    productCode: v(row.PRODUCTCODE),
    premiumMode: v(row.PREMIUMMODE),
    lifePremium: v(row.LIFEPREMIUM),
    supplyPremium: v(row.SUPPLYPREMIUM),
    externalLoad: v(row.EXTERNALLOAD),
    nextPremiumDueDate: v(row.NEXTPREMIUMDUEDATE),
    identificationType: v(row.IDENTIFICATIONTYPE),
    identificationNumber: v(row.IDENTIFICATIONNUMBER),
    agentId: v(row.AGENTID),
    agentMobileNumber: v(row.AGENTMOBILENUMBER),
    agentName: v(row.AGENTNAME),
    sumAtRisk: v(row.ASSUREDSUM),
    policyOption: v(row.POLICYOPTION) ?? '',
    surrenderDate: v(row.SURRENDERDATE) ?? '',
  };

  const missingFields = Object.entries(payload)
    .filter(([key, value]) => value === null && key !== 'status' && key !== 'identificationType')
    .map(([key]) => key);

  const missingMessage = missingFields.length > 0
    ? `Missing fields: ${missingFields.join(', ')}`
    : null;

  if (missingMessage) {
    console.warn(`⚠️ Policy ${row.POLICYNUMBER} — ${missingMessage}`);
  }

  let response;
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      response = await axios.post(
        'https://e-service.idra.org.bd/api/v1/policy',
        payload,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      break;
    } catch (err) {
      const is429 = err.response?.status === 429;
      if (is429 && attempt < RETRY_LIMIT) {
        console.warn(`⏳ 429 Rate limit on ${row.POLICYNUMBER} — waiting ${RETRY_DELAY_MS / 1000}s before retry (attempt ${attempt}/${RETRY_LIMIT})`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }

  const rawStatus = response.data.status;
  const status = typeof rawStatus === 'boolean' ? (rawStatus ? '1' : '0') : String(rawStatus ?? '');
  const message = String(response.data.message ?? '');
  const code = String(response.data.code ?? '');

  const dbResult = await updatePolicyStatus(conn, row, status, message, code);

  console.log(`✅ ${row.POLICYNUMBER} | IDRA: ${status} | rowsAffected: ${dbResult?.rowsAffected ?? 0}`);

  return {
    policyNumber: row.POLICYNUMBER,
    idraResponse: {
      rawStatus,
      status,
      code,
      message,
      data: response.data.data ?? null,
    },
    dbUpdate: {
      rowsAffected: dbResult?.rowsAffected ?? 0,
    },
    ...(missingMessage && { warning: missingMessage }),
  };
}

async function processBatch(conn, batch, access_token) {
  const successes = [];
  const failures = [];

  for (const row of batch) {
    try {
      const result = await processRow(conn, row, access_token);
      successes.push(result);
    } catch (err) {
      console.error(`❌ Failed: ${row.POLICYNUMBER} — ${err.message}`);
      failures.push({ policyNumber: row.POLICYNUMBER, error: err.message });
    }
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  return { successes, failures };
}

const sendPoliciesToIDRA = async (req, res) => {
  let connection;

  try {
    if (!req.session) {
      return res.status(500).json({ error: 'Session is not initialized' });
    }

    let access_token = req.session.access_token_data1;

    if (!access_token) {
      const tokenRes = await axios.post(
        'https://e-service.idra.org.bd/api/v1/authenticate',
        {
          client_id: 'mizan_plicl@yahoo.com',
          client_secret: 'national@2026#',
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Token Response Data:', tokenRes.data);
      access_token = tokenRes.data.access_token;
      req.session.access_token_data1 = access_token;
    }

    const { rows, conn } = await getPendingPolicies();
    connection = conn;

    if (!rows || rows.length === 0) {
      return res.json({ message: 'No policies to process.', totalSent: 0, totalFailed: 0 });
    }

    console.log(`Total pending: ${rows.length} | Batch size: ${BATCH_SIZE}`);

    let allSuccesses = [];
    let allFailures = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`\n--- Batch ${batchNumber}: rows ${i + 1}–${i + batch.length} ---`);

      const { successes, failures } = await processBatch(conn, batch, access_token);

      allSuccesses = allSuccesses.concat(successes);
      allFailures = allFailures.concat(failures);

      console.log(`Batch ${batchNumber} done | ✅ ${successes.length} | ❌ ${failures.length}`);
    }

    res.json({
      message: 'Policy processing completed.',
      totalPending: rows.length,
      totalProcessed: allSuccesses.length + allFailures.length,
      totalSent: allSuccesses.length,
      totalFailed: allFailures.length,
      successes: allSuccesses,
      failures: allFailures,
    });
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('⚠️ Failed to close DB connection:', closeErr);
      }
    }
  }
};

module.exports = { sendPoliciesToIDRA };
