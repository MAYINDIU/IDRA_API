const express = require("express");
const router = express.Router();
const { processMaturedClaims } = require("../controller/IDRACLAIMMICROCOntroller");

router.post("/idra/policyclaim-micro-send", processMaturedClaims);




module.exports = router;
