const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config'); // Your Oracle DB connection

// Get pending OR records
async function getPendingORData() {
  const connection = await connectToDbc();
  
  const query = `
    SELECT *
    FROM (
      SELECT *
      FROM UMP_MICRO_OR_POS
      WHERE traking_id IS NULL
        AND brname IS NOT NULL
        AND PREMIUMMODE IS NOT NULL
        AND SUBSTR(SUSPENSE,1,1) <> '-'
        AND TOTALPAYABLEAMOUNT <> 0
        AND ORID IS NOT NULL
        AND SUBSTR(ORDATE,1,11) > '2023-04-01'
     
       AND SUBSTR(ORDATE,1,11) between '2023-04-01' and '2023-04-30'
       AND flag is null
      ORDER BY ORDATE
    )
  `;
/*
AND SUBSTR(ORDATE,1,11) = '2022-08-30'
AND SUBSTR(ORDATE,1,11) = '2022-08-28'
AND SUBSTR(ORDATE,1,11) between '2022-08-22' and '2022-08-25'
AND SUBSTR(ORDATE,1,11) between '2022-08-01' and '2022-08-21'
*/
  const result = await connection.execute(query, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return { rows: result.rows, connection };
}

// Get OR by ORID
async function getORById(connection, ORID) {
  const query = `SELECT * FROM UMP_MICRO_OR_POS WHERE ORID = :ORID`;
  const result = await connection.execute(
    query,
    { ORID: { val: String(ORID), type: oracledb.STRING } },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows[0];
}

// Update OR data
async function updateORData(connection, ORID, updateData) {
  const { trackingId, code, status, message, url, sendCount, currentDate } = updateData;

  const query = `
    UPDATE UMP_MICRO_OR_POS
    SET traking_id = :trackingId,
        flag = '1',
        code = :code,
        status = :status,
        msg = :message,
        elink = :url,
        send_count = :sendCount,
        udate = :currentDate
        WHERE ORID = :ORID
  `;

  await connection.execute(
    query,
    {
      trackingId: String(trackingId || ''),
      code: String(code || ''),
      status: String(status || ''),
      message: String(message || ''),
      url: String(url || ''),
      sendCount: Number(sendCount || 0),
      currentDate: currentDate || new Date(),
      ORID: String(ORID)
    },
    { autoCommit: true }
  );
}

module.exports = { getPendingORData, getORById, updateORData };
