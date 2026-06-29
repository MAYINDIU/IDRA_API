const express = require("express");
const router = express.Router();
const { processMaturedClaims,processMaturedClaims1,processMaturedClaims3,processMaturedClaims2 } = require("../controller/IdraClaimController");

router.post("/idra/matured-claim/process", processMaturedClaims);
// router.post("/idra/matured-claim/process1", processMaturedClaims1);
// router.post("/idra/matured-claim/process2", processMaturedClaims2);
// router.post("/idra/matured-claim/process3", processMaturedClaims3);


module.exports = router;
