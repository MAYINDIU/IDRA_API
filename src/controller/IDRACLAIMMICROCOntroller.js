const axios = require("axios");
const {
  getPendingMaturedClaims,
  updateClaimStatus,
} = require("../models/IDRACLAIMMICRO");

let accessToken = null;
let tokenDate = null;

/* ===============================
   DATE FORMAT YYYY-MM-DD
================================ */
const formatDate = (date) =>
  date ? new Date(date).toISOString().slice(0, 10) : null;

/* ===============================
   GET IDRA ACCESS TOKEN
================================ */
async function getAccessToken() {
  const today = new Date().toISOString().slice(0, 10);

  if (accessToken && tokenDate === today) {
    return accessToken;
  }

  const response = await axios.post(
    "https://idra-ump.com/app/extern/v1/authenticate",
    {
      client_id: "national",
      client_secret: "wReuzKZy9N",
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  accessToken = response.data.access_token;
  tokenDate = today;

  return accessToken;
}

/* ===============================
   MAIN CONTROLLER
================================ */
exports.processMaturedClaims = async (req, res) => {
  let connection;

  try {
    const token = await getAccessToken();

    const result = await getPendingMaturedClaims();
    const rows = result.rows;
    connection = result.connection;

    if (!rows || rows.length === 0) {
      return res.json({ message: "No matured claims found" });
    }

    const results = [];

    for (const row of rows) {
      const ORID = row.SLNO;

      try {
       const payload = {
  claimNo: row.CLAIM_NO,
  claimDate: formatDate(row.CLAIM_DATE),
  intimationNumber: row.INTIMATION_N0,
  intimationDate: formatDate(row.INTIMATION_DATE),
  insuranceType: row.INSURANCE_TYPE,
  claimType: row.CLAIM_TYPE,
  installmentNumber: row.INSTALLMENT_NO,
  claimAmount: row.CLAIM_AMOUNT,
  accruedBonus: row.ACCRUED_BONUS,
  suspense: row.SUSPENSE,
  totalAmount: row.TOTALAMOUNT,
  deduction: row.DEDUCTION,
  netPayable: row.NETPAYABLE,
  deductionCause: row.DEDUCTION_CAUSE,
  reinsuranceClaimAmount: row.REINSURANCE_CLAIM_AMOUNT,
  claimStatus: row.CLAIM_STATUS,
  unsetteledReason: row.UNSETTELED_REASON,
  nomineeInfo: "", // You can map this later if needed
  multiAccountPayment: row.MULTI_ACCOUNT_PAYMENT,
  multiAccountInfo: "", // Optional, empty for now
  bankAccountName: row.BANK_ACCOUNT_NAME,
  bankAccountNo: row.BANK_ACCOUNT_NO,
  bankName: row.BANK_NAME,
  bankBranchName: row.BANK_BRANCH_NAME,
  bankRoutingNo: row.BANK_ROUTING_NO,
  paymentMethod: row.PAYMENT_METHOD,
  paymentDetail: row.PAYMENT_DETAIL,
  paymentDate: formatDate(row.PAYMENT_DATE),
  policyNumber: row.POLICY_NO,
  riskStartDate: formatDate(row.RISK_START_DATE),
  dateOfBirth: formatDate(row.DATEOFBIRTH),
};


        // console.log(payload)

        const response = await axios.post(
          "https://idra-ump.com/app/extern/v1/claim",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        const { status, code, message } = response.data;
         console.log(response.data)
 




        await updateClaimStatus(connection, ORID, code, message);

        results.push({ ORID, status, code });

        console.log(`✅ CLAIM ${ORID} SENT,message: ${message}`);
      } catch (err) {
        results.push({
          ORID,
          error: err.response?.data || err.message,
        });

        console.error(`❌ CLAIM ${ORID} FAILED`);
      }
    }

    res.json({
      message: "Process completed",
      results,
    });
  } catch (err) {
    console.error("Controller Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
};




