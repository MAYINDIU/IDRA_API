const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config');



async function getPolicyDetails(policyNo, birthDate, mobile) {
  let connection;

  try {
    connection = await connectToDbc();

    const query = `
      SELECT 
        c.NID, c.POLICY_NO, c.DATA_SCHEMA, c.CUSTOMER_NAME, 
        TO_CHAR(c.BIRTH_DATE, 'YYYY-MM-DD') AS BIRTH_DATE, c.MOBILE,
        d.PLAN_ID, d.TERM, d.SUM_ASSURED, d.MODE_OF_PAY, d.LIFEPREM, d.TOTALPREM,
        d.LASTPAID, d.NPAY_DT, d.RISK_DATE, d.MATURITY_DT, d.SOFARPAIDAMOUNT,
        d.TOTAL_INSTALL, d.TOTAL_PAID_INSTALL, d.GENDER, d.AGENT_NAME,
        n.NOM_NAME, n.NOM_AGE, n.NOM_REL,
        p.FPR_OR_DATE, p.FPR_OR_NO, p.TYPE, p.INSTALL_FROM, p.INSTALL_TO, p.PREMIUM_PAID
      FROM APPS_CUSTOMER_POS c
      LEFT JOIN APPS_CUSTOMER_DETAILS_POS d 
        ON c.POLICY_NO = d.POLICY_NO AND c.DATA_SCHEMA = d.DATA_SCHEMA
      LEFT JOIN APPS_NOMINEE_POS n 
        ON c.POLICY_NO = n.POLICY_NO AND c.DATA_SCHEMA = n.DATA_SCHEMA
      LEFT JOIN APPS_PREMIUM_POS p 
        ON c.POLICY_NO = p.PO_NO AND c.DATA_SCHEMA = p.DATA_SCHEMA
      WHERE 
        c.POLICY_NO = :policyNo
        AND c.DATA_SCHEMA = 'AKOK'
        AND (
          (:birthDate IS NOT NULL AND TO_CHAR(c.BIRTH_DATE, 'YYYY-MM-DD') = :birthDate)
          OR (:mobile IS NOT NULL AND c.MOBILE = :mobile)
        )
      ORDER BY p.INSTALL_FROM
    `;

    const result = await connection.execute(query, {
      policyNo,
      birthDate: birthDate || null,
      mobile: mobile || null
    }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    return result.rows; // now returns array of objects
  } finally {
    if (connection) await connection.close();
  }
}


async function getPendingPolicies() {
  const connection = await connectToDbc();

  const query = `SELECT
                POLICYNUMBER ,PROJECTCODE,
                POLICYHOLDERNAME,ADDRESS,POSTALCODE,DISTRICT,GENDER,MOBILENUMBER,EMAIL,DATEOFBIRTH,
                POLICYSTARTDATE,
                POLICYENDDATE,
                RISKSTARTDATE,
                POLICYTYPE,PRODUCTNAME,SUBSTR(PRODUCTCODE,1,3) PRODUCTCODE,
                PREMIUMMODE,TERM,ASSUREDSUM,LIFEPREMIUM,
                SUPPLYPREMIUM,EXTERNALLOAD,TOTALPREMIUM,
                trim(NEXTPREMIUMDUEDATE) NEXTPREMIUMDUEDATE
                ,NOOFPAIDINSTALLMENT,TOTALPAIDAMOUNT,IDENTIFICATIONTYPE,
                IDENTIFICATIONNUMBER,AGENTID,AGENTMOBILENUMBER,null AGENTNAME,STATUS
                --------ASSUREDSUM,'A',null
                
                FROM idraump.IDRA_POLICY_MICRO_SEND
                where  gender is not null
                and (to_char(UUDATE,'yyyymmdd')='20250713'
                or process_date='13-JUL-25')
                -----AND ROWNUM<25000
                AND USTATUS IS NULL`;

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
  const query = `
    UPDATE idraump.IDRA_POLICY_MICRO_SEND
    SET
      flag = '1',
      USTATUS = '1',
      udate = SYSDATE,
      code = :code,
      msg = :msg,
      STATUS = :status
    WHERE POLICYNUMBER = :policyNumber
  `;

  const bindParams = {
    code: String(code ?? ''),
    msg: String(message ?? ''),
    status: String(status ?? ''),
    policyNumber: String(row.POLICYNUMBER ?? '')
  };

  await conn.execute(query, bindParams, { autoCommit: true });
}


module.exports = {
  getPendingPolicies,
  updatePolicyStatus,getPolicyDetails
};