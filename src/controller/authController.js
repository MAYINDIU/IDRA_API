const jwt = require('jsonwebtoken');
const { connectToDbc } = require('../../utils/config');
const oracledb = require('oracledb');

// Laravel-style error extractor
function extractErrors(errors) {
  const formatted = {};
  for (const key in errors) {
    formatted[key] = errors[key].msg;
  }
  return formatted;
}

const loginController = async (req, res) => {
  const { id, password } = req.body;

  // ✅ Laravel-style validation
  const errors = {};
  if (!id) {
    errors.id = { msg: 'ID is required' };
  } else if (!/^\d+$/.test(id)) {
    errors.id = { msg: 'ID must be numeric' };
  }

  if (!password) {
    errors.password = { msg: 'Password is required' };
  } else if (password.length < 3) {
    errors.password = { msg: 'Password must be at least 3 characters' };
  }

  // If validation fails
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'The Given Data was Invalid!',
      errors: extractErrors(errors),
    });
  }

  try {
    const conn = await connectToDbc();

    // ✅ Check if user exists
    const userCheck = await conn.execute(
      `SELECT * FROM MST_LOGIN WHERE NU_EMP_ID = :id AND STATUS = 1`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userCheck.rows.length === 0) {
      await conn.close();
      return res.status(403).json({
        success: false,
        message: 'No User Record Found',
        data: null,
      });
    }

    const user = userCheck.rows[0];

    // ✅ Password check
    if (user.VC_PASSWORD !== password) {
      await conn.close();
      return res.status(403).json({
        success: false,
        message: 'Wrong Credential Combination!',
        data: null,
      });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        id: user.NU_EMP_ID,
        str: Math.random().toString(36).substring(2, 7),
      },
      process.env.JWT_SECRET || 'mayin@123',
      { expiresIn: '1d' }
    );

    await conn.close();

    // ✅ Successful login response
    return res.status(200).json({
      success: true,
      message: 'User Authorized Succesfully!',
      data: {
        username: user.VC_USER_NAME,
        mobile: user.MOBILE,
        id: user.NU_EMP_ID,
        vc_z_code: user.VC_Z_CODE,
        vc_b_code: user.VC_B_CODE,
        bank: user.BANK_NAME,
        branch: user.BRANCH,
        accessToken: token,
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { loginController };
