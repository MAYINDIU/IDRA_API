const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config'); // Your Oracle DB connection

// Get pending OR records
async function getPendingORData() {
  const connection = await connectToDbc();
  
  const query = `SELECT * FROM(
                  SELECT * FROM ump_ordata_pos 
                  WHERE IDRA_traking_id is null
                  and brname is not null
                  and PREMIUMMODE is not null
                  and substr(SUSPENSE,1,1)<>'-'
                  and TOTALPAYABLEAMOUNT <>0
                  and ORID is not null
                  and SUBSTR(PROCESS_DATE,8,4)='2026'
                  AND TO_DATE(SUBSTR(PROCESS_DATE,1,11),'dd-Mon-yyyy')>'21-Jun-2026'
                  --and rownum<2
                  UNION ALL
                  SELECT * FROM ump_ordata_tpos 
                  WHERE IDRA_traking_id is null
                  and brname is not null
                  and PREMIUMMODE is not null
                  and substr(SUSPENSE,1,1)<>'-'
                  and TOTALPAYABLEAMOUNT <>0
                  and ORID is not null
                  and SUBSTR(PROCESS_DATE,8,4)='2026'
                  AND TO_DATE(SUBSTR(PROCESS_DATE,1,11),'dd-Mon-yyyy')>'21-Jun-2026')
                  ORDER BY TO_DATE(SUBSTR(PROCESS_DATE,1,11),'dd-Mon-yyyy') DESC`;

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
async function updateORData(connection, ORID, updateData, isSuccess = false) {
  const { trackingId, code, status, message, url, sendCount, currentDate } = updateData;

  const query = isSuccess
    ? `UPDATE ump_ordata_pos
       SET IDRA_TRAKING_ID = :trackingId,
           uflag = '1',
           idra_code = :code,
           status = :status,
           idra_msg = :message,
           IDRA_LINK = :url,
           send_count = :sendCount,
           idra_send_date = :currentDate
       WHERE ORID = :ORID`
    : `UPDATE ump_ordata_pos
       SET IDRA_TRAKING_ID = :trackingId,
           idra_code = :code,
           status = :status,
           idra_msg = :message,
           IDRA_LINK = :url,
           send_count = :sendCount,
           idra_send_date = :currentDate
       WHERE ORID = :ORID`;

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




