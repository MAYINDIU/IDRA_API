const axios = require("axios");
const {
  getPendingORData,
  getORById,
  updateORData,
} = require("../models/EKokORModel");

let sessionToken = null;
let sessionRefreshToken = null;
let sessionDate = null;

/* ===============================
   FORMAT DATE → YYYY-MM-DD
================================ */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

/* ===============================
   FETCH ACCESS TOKEN (1/DAY CACHE)
================================ */
async function fetchAccessToken() {
  const today = new Date().toISOString().slice(0, 10);

  if (sessionToken && sessionDate === today) {
    return sessionToken;
  }

  // Use refresh_token if available (valid for 2 days) to avoid re-sending credentials
  if (sessionRefreshToken) {
    try {
      const refreshResponse = await axios.post(
        "https://e-service.idra.org.bd/api/v1/refresh-token",
        { refresh_token: sessionRefreshToken },
        { headers: { Accept: "application/json", "Content-Type": "application/json" } }
      );
      sessionToken = refreshResponse.data.access_token;
      sessionRefreshToken = refreshResponse.data.refresh_token || sessionRefreshToken;
      sessionDate = today;
      return sessionToken;
    } catch {
      // refresh expired — fall through to full re-authenticate
    }
  }

  const response = await axios.post(
    "https://e-service.idra.org.bd/api/v1/authenticate",
    {
      client_id: 'mizan_plicl@yahoo.com',
      client_secret: 'national@2026#',
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  sessionToken = response.data.access_token;
  sessionRefreshToken = response.data.refresh_token;
  sessionDate = today;

  return sessionToken;
}

/* ===============================
   STATUS API CALL (PHP MATCH)
================================ */
async function fetchORStatus(token, requestBody, fallbackTrackingId) {
  try {
    const response = await axios.post(
      "https://e-service.idra.org.bd/api/v1/original-receipt/status",
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

/* ===============================
   MAIN CONTROLLER
================================ */
async function processORData(req, res) {
  let connection;

  try {
    const token = await fetchAccessToken();

    const { rows, connection: conn } = await getPendingORData();
    connection = conn;

    if (!rows || rows.length === 0) {
      return res.json({ message: "No OR data to process" });
    }

    const results = [];
    const currentDate = new Date();

    for (const row of rows) {
      const ORID = row.ORID;

      try {
        const orRecord = await getORById(connection, ORID);
        if (!orRecord) continue;

        const sendCount = (orRecord.SEND_COUNT || 0) + 1;

        /* ===============================
           SEND OR DATA
        ================================ */
        const sendBody = {
          orId: String(orRecord.ORID),
          orSerialNumber: "",
          policyNumber: String(orRecord.POLICY || ""),
          productCode: String(orRecord.PRODUCTCODE),
          officeBranchCode: orRecord.OFFICECODE,
          officeBranchName: orRecord.BRNAME,
          orType: orRecord.ORTYPE,
          orDate: formatDate(orRecord.ORDATE),
          dueDate: formatDate(orRecord.DUEDATE),
          fromInstallment: Number(orRecord.FROMINSTALLMENT),
          toInstallment: Number(orRecord.TOINSTALL),
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
          agentName: orRecord.AGENTNAME,
          agentId: orRecord.AGENTID,
          riskStartDate: formatDate(orRecord.RISKSTARTDATE),
          dateOfBirth: formatDate(orRecord.DATEOFBIRTH),
        };

        // console.log(`📦 PAYLOAD ORID ${ORID}:`, JSON.stringify(sendBody, null, 2));

        const sendResponse = await axios.post(
          "https://e-service.idra.org.bd/api/v1/original-receipt",
          sendBody,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const sendData = sendResponse.data || {};
        console.log(`📨 SEND RESULT ORID ${ORID}:`, JSON.stringify({
          httpStatus: sendResponse.status,
          headers: sendResponse.headers,
          data: sendData,
        }, null, 2));

        // ✅ MUST USE THIS FOR STATUS API
        const sendTrackingId =
          sendData.orTrackingId ||
          String(orRecord.ORID) + (orRecord?.BRCODE || "");

        /* ===============================
           STATUS CHECK
        ================================ */
        const statusBody = {
          or_tracking_id: sendTrackingId, // 🔥 REQUIRED
        };

        const statusResult = await fetchORStatus(
          token,
          statusBody,
          sendTrackingId
        );


        /* ===============================
           UPDATE ORACLE
        ================================ */
        const isSuccess = String(statusResult.code) === '200';
        await updateORData(connection, ORID, {
          trackingId: statusResult.trackingId,
          code: statusResult.code,
          status: statusResult.status,
          message: statusResult.message,
          url: sendData.url || statusResult.url || "",
          sendCount,
          currentDate,
        }, isSuccess);

        results.push({
          ORID,
          trackingId: statusResult.trackingId,
          status: statusResult.status,
          code: statusResult.code,
        });

        console.log(
          `✅ ORID ${ORID} | TRACKING ${statusResult.trackingId} | STATUS ${statusResult.status}| policy_no:${orRecord.POLICY}`
        );
      } catch (err) {
        console.error(`❌ ORID ${ORID} FAILED`, err.message);
        results.push({ ORID, error: err.message });
      }
    }

    res.json({
      message: "OR processing completed successfully",
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Oracle close error", e);
      }
    }
  }
}

module.exports = {
  processORData,
};
