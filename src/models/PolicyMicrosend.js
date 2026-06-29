const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config');

async function getPendingPolicies() {
  const connection = await connectToDbc();

//   const query = `
// SELECT
//       POLICYNUMBER, PROJECTCODE,
//       POLICYHOLDERNAME, ADDRESS, POSTALCODE, DISTRICT, GENDER, MOBILENUMBER, EMAIL, DATEOFBIRTH,
//       POLICYSTARTDATE,
//       POLICYENDDATE,
//        RISKSTARTDATE,
//       POLICYTYPE, PRODUCTNAME, SUBSTR(PRODUCTCODE, 1, 2) PRODUCTCODE,
//       PREMIUMMODE, TERM, ASSUREDSUM, LIFEPREMIUM,
//       SUPPLYPREMIUM, EXTERNALLOAD, TOTALPREMIUM,
//        NEXTPREMIUMDUEDATE,
//       NOOFPAIDINSTALLMENT, TOTALPAIDAMOUNT, IDENTIFICATIONTYPE,
//       IDENTIFICATIONNUMBER, AGENTID, AGENTMOBILENUMBER, AGENTNAME, STATUS, UUDATE
//     FROM idraump.IDRA_POLICY_MICRO_SEND
//     WHERE gender IS NOT NULL 
//      AND flag IS NULL 
//     AND (TO_CHAR(UUDATE,'DD-MM-YYYY')='17-02-2026'
//     OR PROCESS_DATE='17-FEB-2026')
//   `;

    const query = `SELECT
      POLICYNUMBER, PROJECTCODE,
      POLICYHOLDERNAME, ADDRESS, POSTALCODE, DISTRICT, GENDER, MOBILENUMBER, EMAIL, DATEOFBIRTH,
      POLICYSTARTDATE,
      POLICYENDDATE,
       RISKSTARTDATE,
      POLICYTYPE, PRODUCTNAME, SUBSTR(PRODUCTCODE, 1, 2) PRODUCTCODE,
      PREMIUMMODE, TERM, ASSUREDSUM, LIFEPREMIUM,
      SUPPLYPREMIUM, EXTERNALLOAD, TOTALPREMIUM,
       NEXTPREMIUMDUEDATE,
      NOOFPAIDINSTALLMENT, TOTALPAIDAMOUNT, IDENTIFICATIONTYPE,
      IDENTIFICATIONNUMBER, AGENTID, AGENTMOBILENUMBER, AGENTNAME, STATUS, UUDATE
    FROM idraump.IDRA_POLICY_MICRO_SEND
    WHERE gender IS NOT NULL 
    AND (TO_CHAR(UUDATE,'DD-MM-YYYY')='23-04-2026'
or PROCESS_DATE = '23-APR-26')
and TO_CHAR(rsend_date,'DD-MM-YYYY')<'23-04-2026'
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
  const table ='IDRA_POLICY_MICRO_SEND';

  const hasUUDATE = row.UUDATE !== null;

  const query = hasUUDATE
    ? `  UPDATE idraump.${table}
       SET flag='1', ustatus='1', udate=SYSDATE,RSEND_DATE=SYSDATE, code=:code, msg=:message, status=:status
       WHERE policynumber=:policyNumber    
       AND TO_CHAR(UUDATE,'DD-MM-YYYY')='23-04-2026'
      `
    : `UPDATE idraump.${table}
       SET flag='1', udate=SYSDATE, code=:code, msg=:message, status=:status
       WHERE policynumber=:policyNumber AND (flag IS NULL OR ustatus IS NULL)`;

     

  const bindParams = {
    code: String(code ?? ''),
    message: String(message ?? ''),
    status: String(status ?? ''),
    policyNumber: String(row.POLICYNUMBER ?? '')
  };

  await conn.execute(query, bindParams, { autoCommit: true });
}

module.exports = {
  getPendingPolicies,
  updatePolicyStatus,
};