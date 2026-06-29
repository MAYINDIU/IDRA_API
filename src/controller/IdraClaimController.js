const axios = require("axios");
const {
  getPendingMaturedClaims,
  updateClaimStatus,
  getPendingMaturedClaims1,
  getPendingMaturedClaims2,
  getPendingMaturedClaims3
} = require("../models/IdraClaimModel");

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
    "https://e-service.idra.org.bd/api/v1/authenticate",
    {
      client_id: "national@idra.org.bd",
      client_secret: "national@2026#",
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
  console.log(accessToken)

  return accessToken;
}

/* ===============================
   MAIN CONTROLLER
================================ */
exports.processMaturedClaims = async (req, res) => {
  let connection;

  try {
    /* =========================================
       1. GET ACCESS TOKEN
    ========================================= */
    const token = await getAccessToken();

    /* =========================================
       2. GET DATABASE DATA
    ========================================= */
    const result = await getPendingMaturedClaims();

    connection = result.connection;

    const rows = result.rows;

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No matured claims found",
      });
    }

    const results = [];

    /* =========================================
       3. LOOP THROUGH CLAIMS
    ========================================= */
    for (const row of rows) {
      const ORID = row.SLNO;

      try {
        /* =========================================
           4. DYNAMIC PAYLOAD
        ========================================= */
        const payload = {
          claimNo: String(row.CLAIM_NO || ""),

          claimDate: formatDate(
            row.CLAIM_DATE
          ),

          intimationNumber:
            row.INTIMATION_NO || "",

          intimationDate: formatDate(
            row.INTIMATION_DATE
          ),

          insuranceType:
            row.INSURANCE_TYPE || "",

          claimType:
            row.CLAIM_TYPE || "",

          installmentNumber: String(
            row.INSTALLMENT_NO || 1
          ),

          claimAmount: Number(
            row.CLAIM_AMOUNT || 0
          ),

          accruedBonus: Number(
            row.ACCRUED_BONUS || 0
          ),

          suspense: Number(
            row.SUSPENSE || 0
          ),

          totalAmount: Number(
            row.TOTALAMOUNT || 0
          ),

          deduction: Number(
            row.DEDUCTION || 0
          ),

          netPayable: Number(
            row.NETPAYABLE || 0
          ),

          deductionCause:
            row.DEDUCTION_CAUSE || "",

          reinsuranceClaimAmount:
            Number(
              row.REINSURANCE_CLAIM_AMOUNT ||
                0
            ),

          claimStatus:
            row.CLAIM_STATUS ||
            "processing",

          unsetteledReason:
            row.UNSETTELED_REASON || "",

          nomineeInfo:
            row.NOMINEE_INFO || "",

          multiAccountPayment:
            row.MULTI_ACCOUNT_PAYMENT ||
            "no",

          multiAccountInfo:
            row.MULTI_ACCOUNT_INFO || "",

          bankAccountName:
            row.BANK_ACCOUNT_NAME || "",

          bankAccountNo:
            row.BANK_ACCOUNT_NO || "",

          bankName:
            row.BANK_NAME || "",

          bankBranchName:
            row.BANK_BRANCH_NAME || "",

          bankRoutingNo:
            row.BANK_ROUTING_NO || "",

          paymentMethod:
            row.PAYMENT_METHOD || "",

          paymentDetail:
            row.PAYMENT_DETAIL || "",

          paymentDate:
            row.PAYMENT_DATE
              ? formatDate(
                  row.PAYMENT_DATE
                )
              : "",

          policyNumber:
            row.POLICY_NO || "",

          riskStartDate:
            row.RISK_START_DATE
              ? formatDate(
                  row.RISK_START_DATE
                )
              : "",

          dateOfBirth:
            row.DATEOFBIRTH
              ? formatDate(
                  row.DATEOFBIRTH
                )
              : "",
        };

        console.log(
          `🚀 Sending Claim: ${ORID}`
        );

        console.log(
          JSON.stringify(
            payload,
            null,
            2
          )
        );

        /* =========================================
           5. SEND API REQUEST
        ========================================= */
        const response =
          await axios.post(
            "https://e-service.idra.org.bd/api/v1/claim",
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept:
                  "application/json",
                "Content-Type":
                  "application/json",
              },
            }
          );

        console.log(
          `✅ CLAIM ${ORID} SUCCESS`
        );

        console.log(
          response.data
        );

        /* =========================================
           6. UPDATE DATABASE
        ========================================= */
        await updateClaimStatus(
          connection,
          ORID,
          response.data.code ||
            "SUCCESS",
          JSON.stringify(
            response.data.message
          )
        );

        results.push({
          ORID,
          success: true,
          response: response.data,
        });

      } catch (err) {

        console.error(
          `❌ CLAIM ${ORID} FAILED`
        );

        console.error(
          err.response?.data ||
            err.message
        );

        results.push({
          ORID,
          success: false,
          error:
            err.response?.data ||
            err.message,
        });
      }

      /* =========================================
         7. DELAY (429 FIX)
      ========================================= */
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }

    /* =========================================
       8. FINAL RESPONSE
    ========================================= */
    return res.status(200).json({
      success: true,
      message:
        "Matured claim processing completed",
      total: rows.length,
      results,
    });

  } catch (err) {

    console.error(
      "❌ Controller Error:",
      err.response?.data ||
        err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.response?.data ||
        err.message,
    });

  } finally {

    if (connection) {
      await connection.close();
    }
  }
};


exports.processMaturedClaims1 = async (req, res) => {
  let connection;

  try {
    const token = await getAccessToken();

    const result = await getPendingMaturedClaims1();
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

exports.processMaturedClaims2 = async (req, res) => {
  let connection;

  try {
    const token = await getAccessToken();

    const result = await getPendingMaturedClaims2();
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




exports.processMaturedClaims3 = async (req, res) => {
  let connection;

  try {
    const token = await getAccessToken();

    const result = await getPendingMaturedClaims3();
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
