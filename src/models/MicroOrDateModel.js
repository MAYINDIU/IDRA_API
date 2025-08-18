const oracledb = require('oracledb');
const { connectToDbc } = require('../../utils/config');

async function getPendingORData() {
  const connection = await connectToDbc();
  const query = `
    SELECT *
    FROM UMP_MICRO_OR_POS
    WHERE traking_id IS NULL
      AND brname IS NOT NULL
      AND PREMIUMMODE IS NOT NULL
      AND SUBSTR(SUSPENSE,1,1) <> '-'
      AND TOTALPAYABLEAMOUNT <> 0
      AND ORID IS NOT NULL
      AND SUBSTR(ORDATE,1,11) > '2021-01-01'
    ORDER BY ORDATE
  `;


  const result = await connection.execute(query, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });
  return { rows: result.rows, connection };
}

async function getORById(connection, ORID) {
  const query = `SELECT * FROM UMP_MICRO_OR_POS WHERE ORID = :ORID`;
  const result = await connection.execute(query, { ORID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return result.rows[0];
}

async function updateORData(connection, ORID, updateData) {
  const {
    trackingId, code, status, message, url, sendCount, currentDate
  } = updateData;

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

  await connection.execute(query, {
    trackingId, code, status, message, url, sendCount, currentDate, ORID
  }, { autoCommit: true });
}

module.exports = { getPendingORData, getORById, updateORData };
