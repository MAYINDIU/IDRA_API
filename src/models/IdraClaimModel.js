const { connectToDbc } = require('../../utils/config'); // function that returns Oracle connection

/* ===============================
   GET PENDING MATURED CLAIMS
================================ */
exports.getPendingMaturedClaims = async () => {
  const connection = await connectToDbc(); // ✅ get connection
  const sql = `
    SELECT SLNO,CLAIM_NO,CLAIM_DATE,INTIMATION_N0,INTIMATION_DATE,INSURANCE_TYPE,CLAIM_TYPE,INSTALLMENT_NO,CLAIM_AMOUNT,ACCRUED_BONUS,SUSPENSE,TOTALAMOUNT,
DEDUCTION,NETPAYABLE,DEDUCTION_CAUSE,REINSURANCE_CLAIM_AMOUNT,CLAIM_STATUS,UNSETTELED_REASON,NOMINEE_NAME,RELATION,ADDRESS,MOBILE_NO,NID,SHARE_PERCENT,
MULTI_ACCOUNT_PAYMENT,BANK_ACCOUNT_NAME,BANK_ACCOUNT_NO,BANK_NAME,BANK_BRANCH_NAME,BANK_ROUTING_NO,PAYMENT_METHOD,PAYMENT_DETAIL,PAYMENT_DATE,
POLICY_NO,RISK_START_DATE,DATEOFBIRTH FROM ALL_CLAIM_IDRA_VIEW_POS
where flag is null
AND CLAIM_TYPE='matured'
and nvl(CLAIM_AMOUNT,0)+nvl(ACCRUED_BONUS,0)+nvl(SUSPENSE,0)=TOTALAMOUNT
and TOTALAMOUNT-DEDUCTION=NETPAYABLE
and INSURANCE_TYPE<>'micro'
and substr(INTIMATION_N0,-2)=24
and flag is null
AND CLAIM_STATUS = 'processing'
  `;

  const result = await connection.execute(sql, {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });

  return { rows: result.rows, connection }; // ✅ return connection for later close
};


exports.getPendingMaturedClaims1 = async () => {
  const connection = await connectToDbc(); // ✅ get connection
  const sql = `
    SELECT SLNO,CLAIM_NO,CLAIM_DATE,INTIMATION_N0,INTIMATION_DATE,INSURANCE_TYPE,CLAIM_TYPE,INSTALLMENT_NO,CLAIM_AMOUNT,ACCRUED_BONUS,SUSPENSE,TOTALAMOUNT,
    DEDUCTION,NETPAYABLE,DEDUCTION_CAUSE,REINSURANCE_CLAIM_AMOUNT,CLAIM_STATUS,UNSETTELED_REASON,NOMINEE_NAME,RELATION,ADDRESS,MOBILE_NO,NID,SHARE_PERCENT,
    MULTI_ACCOUNT_PAYMENT,BANK_ACCOUNT_NAME,BANK_ACCOUNT_NO,BANK_NAME,BANK_BRANCH_NAME,BANK_ROUTING_NO,PAYMENT_METHOD,PAYMENT_DETAIL,PAYMENT_DATE,
    POLICY_NO,RISK_START_DATE,DATEOFBIRTH FROM ALL_CLAIM_IDRA_VIEW_POS
    where flag is null
    AND CLAIM_TYPE='matured'
    and nvl(CLAIM_AMOUNT,0)+nvl(ACCRUED_BONUS,0)+nvl(SUSPENSE,0)=TOTALAMOUNT
    and TOTALAMOUNT-DEDUCTION=NETPAYABLE
    and INSURANCE_TYPE<>'micro'
    and substr(INTIMATION_DATE,-6)='SEP-25'
    and substr(INTIMATION_N0,-2)=25
    and flag is null
    AND CLAIM_STATUS = 'settled'
      `;

  const result = await connection.execute(sql, {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });

  return { rows: result.rows, connection }; // ✅ return connection for later close
};


exports.getPendingMaturedClaims2 = async () => {
  const connection = await connectToDbc(); // ✅ get connection
  const sql = `
    SELECT SLNO,CLAIM_NO,CLAIM_DATE,INTIMATION_N0,INTIMATION_DATE,INSURANCE_TYPE,CLAIM_TYPE,INSTALLMENT_NO,CLAIM_AMOUNT,ACCRUED_BONUS,SUSPENSE,TOTALAMOUNT,
DEDUCTION,NETPAYABLE,DEDUCTION_CAUSE,REINSURANCE_CLAIM_AMOUNT,CLAIM_STATUS,UNSETTELED_REASON,NOMINEE_NAME,RELATION,ADDRESS,MOBILE_NO,NID,SHARE_PERCENT,
MULTI_ACCOUNT_PAYMENT,BANK_ACCOUNT_NAME,BANK_ACCOUNT_NO,BANK_NAME,BANK_BRANCH_NAME,BANK_ROUTING_NO,PAYMENT_METHOD,PAYMENT_DETAIL,PAYMENT_DATE,
POLICY_NO,RISK_START_DATE,DATEOFBIRTH FROM ALL_CLAIM_IDRA_VIEW_POS
where flag is null
AND CLAIM_TYPE='matured'
and nvl(CLAIM_AMOUNT,0)+nvl(ACCRUED_BONUS,0)+nvl(SUSPENSE,0)=TOTALAMOUNT
and TOTALAMOUNT-DEDUCTION=NETPAYABLE
and INSURANCE_TYPE<>'micro'
and substr(INTIMATION_DATE,-6)='NOV-25'
and substr(INTIMATION_N0,-2)=25
and flag is null
AND CLAIM_STATUS = 'settled'
  `;

  const result = await connection.execute(sql, {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });

  return { rows: result.rows, connection }; // ✅ return connection for later close
};

exports.getPendingMaturedClaims3 = async () => {
  const connection = await connectToDbc(); // ✅ get connection
  const sql = `
    SELECT SLNO,CLAIM_NO,CLAIM_DATE,INTIMATION_N0,INTIMATION_DATE,INSURANCE_TYPE,CLAIM_TYPE,INSTALLMENT_NO,CLAIM_AMOUNT,ACCRUED_BONUS,SUSPENSE,TOTALAMOUNT,
DEDUCTION,NETPAYABLE,DEDUCTION_CAUSE,REINSURANCE_CLAIM_AMOUNT,CLAIM_STATUS,UNSETTELED_REASON,NOMINEE_NAME,RELATION,ADDRESS,MOBILE_NO,NID,SHARE_PERCENT,
MULTI_ACCOUNT_PAYMENT,BANK_ACCOUNT_NAME,BANK_ACCOUNT_NO,BANK_NAME,BANK_BRANCH_NAME,BANK_ROUTING_NO,PAYMENT_METHOD,PAYMENT_DETAIL,PAYMENT_DATE,
POLICY_NO,RISK_START_DATE,DATEOFBIRTH FROM ALL_CLAIM_IDRA_VIEW_POS
where flag is null
AND CLAIM_TYPE='matured'
and nvl(CLAIM_AMOUNT,0)+nvl(ACCRUED_BONUS,0)+nvl(SUSPENSE,0)=TOTALAMOUNT
and TOTALAMOUNT-DEDUCTION=NETPAYABLE
and INSURANCE_TYPE<>'micro'
and substr(INTIMATION_DATE,-6)='OCT-25'
and substr(INTIMATION_N0,-2)=25
and flag is null
AND CLAIM_STATUS = 'settled'
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
    WHERE POLICY_NO || CLAIM_STATUS = :ORID
      AND FLAG IS NULL
  `;

  return connection.execute(
    sql,
    { ORID, code, message },
    { autoCommit: true }
  );
};
