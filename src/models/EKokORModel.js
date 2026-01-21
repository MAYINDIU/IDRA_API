const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config'); // Your Oracle DB connection

// Get pending OR records
async function getPendingORData() {
  const connection = await connectToDbc();
  
  const query = `
  SELECT *
FROM (
    SELECT * FROM ump_ordata_pos
    WHERE SUBSTR(PROCESS_DATE, 8, 4) = '2025'
      AND MSG <> 'Single original receipt submitted'
       AND MSG <> 'This OR exists in UMP'
    UNION ALL
    SELECT * FROM ump_ordata_tpos
    WHERE SUBSTR(PROCESS_DATE, 8, 4) = '2025'
      AND MSG <> 'Single original receipt submitted'
       AND MSG <> 'This OR exists in UMP'
)
ORDER BY TO_DATE(SUBSTR(PROCESS_DATE,1,11),'DD-Mon-YYYY') DESC
  `;

  const result = await connection.execute(query, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return { rows: result.rows, connection };
}

// Get OR by ORID
async function getORById(connection, ORID) {
  const query = `SELECT * FROM ump_ordata_pos WHERE ORID = :ORID`;
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
    UPDATE ump_ordata_pos
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
