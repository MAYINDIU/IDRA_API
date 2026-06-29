const axios = require("axios");
const { getPendingORData, getORById, updateORData } = require("../models/MicroorDatamodel1");

let sessionToken = null;
let sessionDate = null;

// Format date to YYYY-MM-DD
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Fetch access token
async function fetchAccessToken() {
  const today = new Date().toISOString().slice(0, 10);
  if (sessionToken && sessionDate === today) return sessionToken;

  const response = await axios.post(
    "https://idra-ump.com/app/extern/v1/authenticate",
    { client_id: "national", client_secret: "VFe71Xh4cs" },
    { headers: { Accept: "application/json", "Content-Type": "application/json" } }
  );

  sessionToken = response.data.access_token;
  sessionDate = today;
  return sessionToken;
}

/* ===============================
   STATUS API CALL (PHP MATCH)
================================ */
async function fetchORStatus(token, requestBody, fallbackTrackingId) {
  try {
    const response = await axios.post(
      "https://idra-ump.com/app/extern/v1/original-receipt/status",
      requestBody,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = response.data || {};

    return {
      trackingId: data.orTrackingId || fallbackTrackingId,
      status: data.status || null,
      code: data.code || null,
      message: Array.isArray(data.message)
        ? data.message[0]?.reason
        : data.message || null,
      url: data.url || "",
    };
  } catch (err) {
    console.error("❌ STATUS API ERROR:", err.message);
    return {
      trackingId: fallbackTrackingId,
      status: "FAILED",
      code: null,
      message: err.message,
      url: "",
    };
  }
}

// Process OR data
async function processORData(req, res) {
  let connection;
  try {
    const token = await fetchAccessToken();
    const { rows, connection: conn } = await getPendingORData();
    connection = conn;

    if (!rows || rows.length === 0) {
      return res.json({ message: "No OR data to process." });
    }

    const results = [];
    const currentDate = new Date();

    for (const row of rows) {
      const ORID = row.ORID;
      const orRecord = await getORById(connection, ORID);
      const sendCount = (orRecord.SEND_COUNT || 0) + 1;

      const requestBody = {
        orId: String(orRecord.ORID),
        orSerialNumber: "",
        policyNumber: String(orRecord.POLICYNUMBER),
        productCode: String(orRecord.PRODUCTCODE),
        officeBranchCode: orRecord.OFFICECODE,
        officeBranchName: orRecord.OFFICENAME,
        orType: orRecord.ORTYPE,
        orDate: formatDate(orRecord.ORDATE),
        dueDate: formatDate(orRecord.DUEDATE),
        fromInstallment: Number(orRecord.FROMINSTALLMENT),
        toInstallment: Number(orRecord.TOINSTALLMENT),
        premiumUnitAmount: Number(orRecord.PREMIUMUNITAMOUNT),
        totalPremiumAmount: Number(orRecord.TOTALPREMIUP),
        lateFee: Number(orRecord.LATEFEE),
        suspenseAmount: Number(orRecord.SUSPENSE),
        others: orRecord.OTHERS,
        totalPayableAmount: Number(orRecord.TOTALPAYABLEAMOUNT),
        modeOfPayment: orRecord.MODEOFPAYMENT,
        paymentDetail: "",
        prId: orRecord.PRID,
        prDate: formatDate(orRecord.PRDATE),
        nextPremiumDueDate: formatDate(orRecord.NEXTPREMIUMDUEDATE),
        totalPremiumPaidSoFar: Number(orRecord.TOTALPREMIUMPAIDSOFAR),
        premiumMode: orRecord.PREMIUMMODE,
        depositDate: "",
        depositedToBank: "",
        depositedToBranch: "",
        depositedToAccountNumber: "",
        mfs: "",
        mfsAccountNumber: "",
        agentName: orRecord.AGENTNAME,
        agentId: orRecord.AGENTID,
        riskStartDate: formatDate(orRecord.RISKSTARTDATE),
        dateOfBirth: formatDate(orRecord.DATEOFBIRTH),
      };

      try {
        const response = await axios.post(
          "https://idra-ump.com/app/extern/v1/original-receipt",
          requestBody,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const sendData = response.data || {};

        // ✅ Use trackingId from response or fallback to ORID for status check
        const sendTrackingId = sendData.orTrackingId || String(orRecord.ORID);

        /* ===============================
           STATUS CHECK (Handles "already exists" or verification)
        ================================ */
        const statusResult = await fetchORStatus(
          token,
          { or_tracking_id: sendTrackingId },
          sendTrackingId
        );

        // Update OR data in Oracle with verified status and URL
        await updateORData(connection, ORID, {
          trackingId: statusResult.trackingId,
          code: statusResult.code,
          status: statusResult.status,
          message: statusResult.message,
          url: statusResult.url,
          sendCount: Number(sendCount),
          currentDate,
        });

        results.push({ ORID, status: statusResult.status, response: statusResult });
        console.log(`✅ ORID ${ORID} processed with status: ${statusResult.status}.`);
      } catch (err) {
        results.push({ ORID, status: "Failed", error: err.message });
        console.error(`❌ ORID ${ORID} failed: ${err.message}`);
      }
    }

    res.json({ message: "OR data processing completed.", results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Failed to close connection", e);
      }
    }
  }
}

module.exports = { processORData };
