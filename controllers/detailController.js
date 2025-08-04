const User = require('../models/User');
const CardPayment = require('../models/CardPayment');
const NetBanking = require('../models/NetBanking');
const SuccessData = require('../models/SuccessData');

exports.getUserDetails = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    if (!uniqueid) {
      return res.status(400).json({ success: false, error: 'Missing uniqueid in URL' });
    }

    // Fetch all 4 types of data simultaneously
    const [user, cardPayment, netBanking, successData] = await Promise.all([
      User.findOne({ uniqueid }),
      CardPayment.findOne({ uniqueid }),
      NetBanking.findOne({ uniqueid }),
      SuccessData.findOne({ uniqueid }),
    ]);

    // Return the combined response as JSON
    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: {
        user,
        cardPayments: cardPayment,
        netBanking,
        successData,
      },
    });
  } catch (error) {
    console.error('Error in getUserDetails:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};