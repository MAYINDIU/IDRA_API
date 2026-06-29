const axios = require('axios');
const { getPendingPolicies, updatePolicyStatus } = require('../models/PolicyMicrosend');
const { connectToDbc } = require('../../utils/config');

const sendPoliciesToIDRA = async (req, res) => {
  let connection;
  let successCount = 0;
  let failureCount = 0;
  let failures = [];
  let feedbacks = [];

  try {
    if (!req.session) {
      return res.status(500).json({ error: 'Session is not initialized' });
    }

    let access_token = req.session.access_token_data1;

    if (!access_token) {
      const tokenRes = await axios.post(
        'https://idra-ump.com/app/extern/v1/authenticate',
        {
          client_id: 'national',
          client_secret: 'VFe71Xh4cs',
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      access_token = tokenRes.data.access_token;
      req.session.access_token_data1 = access_token;
    }

    const { rows, conn } = await getPendingPolicies();
    connection = conn;

    if (!rows || rows.length === 0) {
      return res.json({ message: 'No policies to process.', totalSent: 0, totalFailed: 0 });
    }

    for (const row of rows) {
      const payload = {
        policyNumber: row.POLICYNUMBER,
        projectCode: row.PROJECTCODE,
        policyHolderName: row.POLICYHOLDERNAME,
        dateOfBirth: row.DATEOFBIRTH,
        policyStartDate: row.POLICYSTARTDATE,
        policyEndDate: row.POLICYENDDATE,
        riskStartDate: row.RISKSTARTDATE,
        term: row.TERM,
        assuredSum: row.ASSUREDSUM,
        totalPremium: row.TOTALPREMIUM,
        noOfPaidInstallment: row.NOOFPAIDINSTALLMENT,
        totalPaidAmount: row.TOTALPAIDAMOUNT,
        status: null, // force null
        email: row.EMAIL,
        address: row.ADDRESS,
        postalCode: row.POSTALCODE,
        district: row.DISTRICT,
        gender: row.GENDER,
        mobileNumber: row.MOBILENUMBER,
        policyType: row.POLICYTYPE,
        productName: row.PRODUCTNAME,
        productCode: row.PRODUCTCODE,
        premiumMode: row.PREMIUMMODE,
        lifePremium: row.LIFEPREMIUM,
        supplyPremium: row.SUPPLYPREMIUM,
        externalLoad: row.EXTERNALLOAD,
        nextPremiumDueDate: row.NEXTPREMIUMDUEDATE,
        identificationType: row.IDENTIFICATIONTYPE,
        identificationNumber: row.IDENTIFICATIONNUMBER,
        agentId: row.AGENTID,
        agentMobileNumber: row.AGENTMOBILENUMBER,
        agentName: row.AGENTNAME,
        sumAtRisk: row.ASSUREDSUM,
        policyOption: '',
        surrenderDate: '',
      };

      try {
        const response = await axios.post(
          'https://idra-ump.com/app/extern/v1/policy',
          payload,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const status = typeof response.data.status === 'string' ? response.data.status : JSON.stringify(response.data.status);
        const message = typeof response.data.message === 'string' ? response.data.message : JSON.stringify(response.data.message);
        const code = typeof response.data.code === 'string' ? response.data.code : JSON.stringify(response.data.code);

        await updatePolicyStatus(conn, row, status, message, code);

        // console.log( row, status, message, code)

        // ✅ Add to feedback array
        feedbacks.push({
          policyNumber: row.POLICYNUMBER,
          status,
          code,
          message,
        });

        console.log(`✅ Synced and updated: ${row.POLICYNUMBER}`);
        successCount++;
      } catch (apiError) {
        console.error(`❌ Failed to send policy ${row.POLICYNUMBER}:`, apiError.message);
        failures.push({ policyNumber: row.POLICYNUMBER, error: apiError.message });
        failureCount++;
      }
    }

    res.json({
      message: 'Policy processing completed.',
      totalSent: successCount,
      totalFailed: failureCount,
      successes: feedbacks,   // ✅ API response messages for successful syncs
      failures,
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