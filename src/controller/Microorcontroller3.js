const axios = require("axios");
const { getPendingORData, getORById, updateORData } = require("../models/MicroorDatamodel3");

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
    { client_id: "national", client_secret: "wReuzKZy9N" },
    { headers: { Accept: "application/json", "Content-Type": "application/json" } }
  );

  sessionToken = response.data.access_token;
  sessionDate = today;
  return sessionToken;
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

        const data = response.data;
        const trackingId = data.orTrackingId || null;
        const status = data.status || null;
        const code = data.code || null;
        const url = data.url || null;


                let message = "";
                if (Array.isArray(response.data.message) && response.data.message.length > 0) {
                // Take the 'reason' of the first element
                message = response.data.message[0].reason;
                } else if (typeof response.data.message === "string") {
                message = response.data.message;
                } else {
                message = JSON.stringify(response.data.message);
                }

                // console.log(message);
                // Output: "Total Premium amount is not equal with noOfInstallment * premiumUnitAmount"


        // Update OR data in Oracle
        await updateORData(connection, ORID, {
          trackingId,
          code,
          status,
          message,
          url,
          sendCount: Number(sendCount),
          currentDate,
        });

        results.push({ ORID, status: code === 200 || code === "200" ? "Sent" : "Error", response: data });
        console.log(`✅ ORID ${ORID} "Message: " ${message} processed with code ${code}.`);
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
