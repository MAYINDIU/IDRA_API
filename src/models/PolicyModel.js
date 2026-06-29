const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config');

async function getPendingPolicies() {
  const connection = await connectToDbc();

  const query = `
   SELECT
      POLICYNUMBER, PROJECTCODE,
      POLICYHOLDERNAME, ADDRESS, POSTALCODE, DISTRICT, GENDER, MOBILENUMBER, EMAIL, DATEOFBIRTH,
      TO_CHAR(POLICYSTARTDATE, 'YYYY-MM-DD') POLICYSTARTDATE,
      TO_CHAR(POLICYENDDATE, 'YYYY-MM-DD') POLICYENDDATE,
      TO_CHAR(RISKSTARTDATE, 'YYYY-MM-DD') RISKSTARTDATE,
      POLICYTYPE, PRODUCTNAME, SUBSTR(PRODUCTCODE, 1, 2) PRODUCTCODE,
      PREMIUMMODE, TERM, ASSUREDSUM, LIFEPREMIUM,
      SUPPLYPREMIUM, EXTERNALLOAD, TOTALPREMIUM,
      TO_CHAR(NEXTPREMIUMDUEDATE, 'YYYY-MM-DD') NEXTPREMIUMDUEDATE,
      NOOFPAIDINSTALLMENT, TOTALPAIDAMOUNT, IDENTIFICATIONTYPE,
      IDENTIFICATIONNUMBER, AGENTID, AGENTMOBILENUMBER, AGENTNAME, STATUS, UUDATE
    FROM idraump.IDRA_POLICY_AKOK_SEND
    WHERE gender IS NOT NULL AND uflag IS NULL
    AND POLICYSTARTDATE > TO_DATE('2026-06-15', 'YYYY-MM-DD')
    AND POLICYSTARTDATE <= SYSDATE
    AND POLICYSTARTDATE < ADD_MONTHS(TRUNC(SYSDATE, 'YYYY'), 12)

    UNION ALL

   SELECT
    POLICYNUMBER, PROJECTCODE,
    POLICYHOLDERNAME, ADDRESS, POSTALCODE, DISTRICT, GENDER, MOBILENUMBER, EMAIL, DATEOFBIRTH,
    TO_CHAR(POLICYSTARTDATE, 'YYYY-MM-DD') POLICYSTARTDATE,
    TO_CHAR(POLICYENDDATE, 'YYYY-MM-DD') POLICYENDDATE,
    TO_CHAR(RISKSTARTDATE, 'YYYY-MM-DD') RISKSTARTDATE,
    POLICYTYPE, PRODUCTNAME, SUBSTR(PRODUCTCODE, 1, 2) PRODUCTCODE,
    PREMIUMMODE, TERM, ASSUREDSUM, LIFEPREMIUM,
    SUPPLYPREMIUM, EXTERNALLOAD, TOTALPREMIUM,
    TO_CHAR(NEXTPREMIUMDUEDATE, 'YYYY-MM-DD') NEXTPREMIUMDUEDATE,
    NOOFPAIDINSTALLMENT, TOTALPAIDAMOUNT, IDENTIFICATIONTYPE,
    IDENTIFICATIONNUMBER, TO_CHAR(AGENTID) AS AGENTID, AGENTMOBILENUMBER, NULL AS AGENTNAME, STATUS, UUDATE
FROM idraump.IDRA_POLICY_TAKA_SEND
WHERE gender IS NOT NULL
  AND uflag IS NULL
  AND POLICYSTARTDATE > TO_DATE('2026-06-15', 'YYYY-MM-DD')
    AND POLICYSTARTDATE <= SYSDATE
  AND POLICYSTARTDATE < ADD_MONTHS(TRUNC(SYSDATE, 'YYYY'), 12) 
  
  `;

  const result = await connection.execute(query, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    fetchInfo: {
      POLICYHOLDERNAME: { type: oracledb.STRING },
      ADDRESS: { type: oracledb.STRING },
      POSTALCODE: { type: oracledb.STRING },
      DISTRICT: { type: oracledb.STRING },
      GENDER: { type: oracledb.STRING },
      MOBILENUMBER: { type: oracledb.STRING },
      EMAIL: { type: oracledb.STRING },
      DATEOFBIRTH: { type: oracledb.STRING },
      POLICYTYPE: { type: oracledb.STRING },
      PRODUCTNAME: { type: oracledb.STRING },
      PRODUCTCODE: { type: oracledb.STRING },
      PREMIUMMODE: { type: oracledb.STRING },
      IDENTIFICATIONTYPE: { type: oracledb.STRING },
      IDENTIFICATIONNUMBER: { type: oracledb.STRING },
      AGENTID: { type: oracledb.STRING },
      AGENTMOBILENUMBER: { type: oracledb.STRING },
      AGENTNAME: { type: oracledb.STRING },
      STATUS: { type: oracledb.STRING },
      PROJECTCODE: { type: oracledb.STRING }
    }
  });


  return { rows: result.rows, conn: connection };
}

async function updatePolicyStatus(conn, row, status, message, code) {
  const projectCode = row.PROJECTCODE;
  const table =
    projectCode === 'Akokbima'
      ? 'IDRA_POLICY_AKOK_SEND'
      : 'IDRA_POLICY_TAKA_SEND';

  const hasUUDATE = row.UUDATE !== null;

  const query = hasUUDATE
    ? `UPDATE idraump.${table}
       SET UFLAG='1', ustatus='1', IDRA_SEND_DATE=SYSDATE, IDRA_CODE=:code, IDRA_MSG=:message, status=:status
       WHERE policynumber=:policyNumber AND (UFLAG IS NULL)`
    : `UPDATE idraump.${table}
       SET UFLAG='1', IDRA_SEND_DATE=SYSDATE, IDRA_CODE=:code, IDRA_MSG=:message, status=:status
       WHERE policynumber=:policyNumber AND (UFLAG IS NULL)`;

  const bindParams = {
    code: String(code ?? ''),
    message: String(message ?? ''),
    status: String(status ?? ''),
    policyNumber: String(row.POLICYNUMBER ?? '')
  };

  const result = await conn.execute(query, bindParams, { autoCommit: true });
  return result;
}

module.exports = {
  getPendingPolicies,
  updatePolicyStatus,
};