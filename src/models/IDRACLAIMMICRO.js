const { connectToDbc } = require('../../utils/config'); // function that returns Oracle connection

/* ===============================
   GET PENDING MATURED CLAIMS
================================ */
exports.getPendingMaturedClaims = async () => {
  const connection = await connectToDbc(); // ✅ get connection
  const sql = `SELECT SLNO,CLAIM_NO,CLAIM_DATE,INTIMATION_N0,INTIMATION_DATE,INSURANCE_TYPE,CLAIM_TYPE,INSTALLMENT_NO,CLAIM_AMOUNT,ACCRUED_BONUS,SUSPENSE,TOTALAMOUNT,
DEDUCTION,NETPAYABLE,DEDUCTION_CAUSE,REINSURANCE_CLAIM_AMOUNT,CLAIM_STATUS,UNSETTELED_REASON,NOMINEE_NAME,RELATION,ADDRESS,MOBILE_NO,NID,SHARE_PERCENT,
MULTI_ACCOUNT_PAYMENT,BANK_ACCOUNT_NAME,BANK_ACCOUNT_NO,BANK_NAME,BANK_BRANCH_NAME,BANK_ROUTING_NO,PAYMENT_METHOD,PAYMENT_DETAIL,PAYMENT_DATE,
POLICY_NO,RISK_START_DATE,DATEOFBIRTH FROM ALL_CLAIM_IDRA_VIEW_POS
where FLAG IS NULL
AND CLAIM_TYPE='sb'
AND INSURANCE_TYPE='micro'



  `;

  const result = await connection.execute(sql, {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });

  return { rows: result.rows, connection }; // ✅ return connection for later close
};




/* ===============================
   UPDATE CLAIM STATUS
================================ */
exports.updateClaimStatus = async (connection, ORID, code, message) => {
  const sql = `
    UPDATE ALL_CLAIM_IDRA_POS
    SET FLAG = '1',
        CODE = :code,
        MSG = :message,
        SEND_DATE = SYSDATE
    WHERE POLICY_NO||INSTALLMENT_NO || CLAIM_STATUS = :ORID
      AND FLAG IS NULL
  `;

  return connection.execute(
    sql,
    { ORID, code, message },
    { autoCommit: true }
  );
};
