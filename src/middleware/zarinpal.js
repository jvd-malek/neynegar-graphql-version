exports.createpayment = async ({ amountInRial, mobile, desc }) => {
    try {
        const res = await fetch(process.env.zarinpal_api_base_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                merchant_id: process.env.zarinpal_merchant_id,
                amount: amountInRial,
                description: desc,
                callback_url: process.env.zarinpal_api_callBack,
                metadata: { mobile },
            })
        })
            .then(res => res.json())

        return { authority: res.data.authority, paymentURL: process.env.zarinpal_payment_url + res.data.authority }
    } catch (error) {
        console.log(error);
    }
}

exports.verifypayment = async ({ amountInRial, authority }) => {
    try {
        const res = await fetch(process.env.zarinpal_api_verify, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                merchant_id: process.env.zarinpal_merchant_id,
                amount: amountInRial,
                authority
            })
        })
            .then(res => res.json())
        return res
    } catch (error) {
        console.log(error);
    }
}