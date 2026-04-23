const userModel = require('../models/User');
const sendSms = require('./sendSms');

// Generate a random alphanumeric discount code of given length
function generateDiscountCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Add discount to user and save
async function appendDiscountToUser(userDoc, { code, discountPercent, expireAt }) {
    userDoc.discount.push({ code, discount: discountPercent, date: expireAt, status: 'active' });
    userDoc.lastPromoSentAt = Date.now();
    await userDoc.save();
}

// Find users with non-empty basket, updatedAt older than 2 days, and not sent promo in last 10 days
async function findTargetUsers() {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAgoMs = Date.now() - 10 * 24 * 60 * 60 * 1000;

    // Users with items in basket, and updatedAt older than 2 days
    // and either never sent promo or sent before 10 days ago
    return await userModel.find({
        bascket: { $exists: true, $ne: [] },
        updatedAt: { $lte: twoDaysAgo },
        $or: [
            { lastPromoSentAt: { $exists: false } },
            { lastPromoSentAt: null },
            { lastPromoSentAt: { $lte: tenDaysAgoMs } }
        ]
    }).select('_id name phone');
}

async function runDailyPromoJob() {
    try {
        const targets = await findTargetUsers();
        if (!targets || targets.length === 0) return;

        // Configs
        const discountPercent = Number(process.env.PROMO_DISCOUNT_PERCENT || 5);
        const promoValidDays = Number(process.env.PROMO_VALID_DAYS || 7);
        const patternCode = process.env.SMS_PROMO_PATTERN || 'srk5muz02fsod4k';

        for (const user of targets) {
            try {
                const code = generateDiscountCode(6);
                const expireAt = Date.now() + promoValidDays * 24 * 60 * 60 * 1000;

                // Save code first to avoid duplicates and set lastPromoSentAt
                const userDoc = await userModel.findById(user._id);
                await appendDiscountToUser(userDoc, { code, discountPercent, expireAt });

                // Send SMS
                await sendSms({
                    to: user.phone,
                    patternCode,
                    inputData: [{ 'discount-code': code, "discount-amount": discountPercent, "ex-time": promoValidDays }]
                });
            } catch (e) {
                console.error('Promo send failed for user', user._id, e);
            }
        }
    } catch (err) {
        console.error('Daily promo job error:', err);
    }
}

function startScheduler() {
    // Run once at startup (optional)
    setTimeout(runDailyPromoJob, 10_000);

    // Then daily at a fixed interval (24h)
    const oneDayMs = 24 * 60 * 60 * 1000;
    setInterval(runDailyPromoJob, oneDayMs);
}

module.exports = { startScheduler, runDailyPromoJob };


