const Checkout = require('../../models/Checkout');
const Order = require('../../models/Order');
const ShippingCost = require('../../models/ShippingCost');
const userModel = require('../../models/User');
const { createpayment, verifypayment } = require('../../middleware/zarinpal');
const Package = require('../../models/Package');

const checkoutResolvers = {
  Query: {
    checkouts: async () => {
      return await Checkout.find();
    },
    checkout: async (_, { id }) => {
      return await Checkout.findById(id);
    },
    checkoutsByUser: async (_, { userId }) => {
      return await Checkout.find({ userId });
    }
  },

  Mutation: {
    createCheckout: async (_, { input }) => {
      const checkout = new Checkout({
        ...input,
        // expiredAt: moment().add(1, 'hour').format('YYYY/MM/DD HH:mm:ss')
      });
      return await checkout.save();
    },

    updateCheckout: async (_, { id, input }) => {
      return await Checkout.findByIdAndUpdate(id, input, { new: true });
    },

    deleteCheckout: async (_, { id }) => {
      const result = await Checkout.findByIdAndDelete(id);
      return !!result;
    },

    convertCheckoutToOrder: async (_, { checkoutId }) => {
      const checkout = await Checkout.findById(checkoutId);
      if (!checkout) throw new Error('Checkout not found');

      const order = new Order({
        products: checkout.products.map(product => ({
          productId: product.productId,
          packageId: product.packageId,
          price: 0, // بهتر است قیمت از محصول/پکیج پر شود اما اینجا صرفاً برای تکمیل ساختار
          discount: 0,
          count: product.count
        })),
        submition: checkout.submition,
        totalPrice: checkout.totalPrice,
        totalWeight: checkout.totalWeight,
        discount: checkout.discount,
        status: 'در انتظار پرداخت',
        authority: checkout.authority,
        userId: checkout.userId
      });

      const savedOrder = await order.save();
      await Checkout.findByIdAndDelete(checkoutId);
      return savedOrder;
    },

    createCheckoutPayment: async (_, { shipment, discountCode }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const User = await userModel.findById(user._id)
          .populate("bascket.productId")

        // -----------------------------------------------------
        // 1) USER DISCOUNT
        // -----------------------------------------------------
        let usedDiscountCode = discountCode || '';
        let discountAmount = 0;
        if (discountCode) {
          const userDiscount = User.discount?.find(d => d.code === discountCode && d.date > Date.now() && d.status === 'active');
          if (userDiscount) discountAmount = userDiscount.discount;
        }

        let subtotal = 0;
        let totalDiscount = 0;
        let total = 0;
        let totalWeight = 0;
        const enrichedBasket = [];

        // -----------------------------------------------------
        // 1) PRODUCT ITEMS
        // -----------------------------------------------------
        for (const item of User.bascket.filter(i => i.productId)) {
          const p = item.productId;
          const itemPrice = p.currentPrice || 0;
          const currentDiscount = p.currentDiscount || 0;
          const discountAmountPerUnit = itemPrice * (currentDiscount / 100);
          const finalItemPrice = (itemPrice - discountAmountPerUnit) * item.count;
          const weight = (p.weight || 0) * item.count;

          console.log(finalItemPrice);
          console.log(p.finalPrice);


          subtotal += itemPrice * item.count;
          totalDiscount += discountAmountPerUnit * item.count;
          total += finalItemPrice;
          totalWeight += weight;

          enrichedBasket.push({
            count: item.count,
            productId: p._id,
            packageId: null,
            currentPrice: itemPrice,
            currentDiscount,
            itemTotal: finalItemPrice,
            itemDiscount: discountAmountPerUnit * item.count,
            itemWeight: weight
          });
        }

        // -----------------------------------------------------
        // 2) PACKAGE ITEMS (اصلاح شده)
        // -----------------------------------------------------
        const userPackages = User.bascket.filter(item => item.packageId);

        if (userPackages.length > 0) {

          const packageIds = userPackages.map(item => item.packageId);

          const packages = await Package.find({ _id: { $in: packageIds } })
            .populate('products.product');

          // ساخت مپ برای دسترسی سریع
          const packageMap = {};
          packages.forEach(pkg => { packageMap[pkg._id.toString()] = pkg; });

          userPackages.forEach(item => {
            const pkg = packageMap[item.packageId.toString()];


            if (item.count > pkg.showCount) {
              throw new Error(`از پکیج ${pkg.title} فقط ${pkg.showCount} عدد موجود است`);
            }

            if (pkg) {
              const price = pkg.totalPrice;
              const currentDiscount = pkg.currentDiscount;
              const discountAmountPerUnit = price * (currentDiscount / 100);
              const finalPrice = (price - discountAmountPerUnit) * item.count;
              const weight = pkg.totalWeight * item.count;

              subtotal += price * item.count;
              totalDiscount += discountAmountPerUnit * item.count;
              total += finalPrice;
              totalWeight += weight;

              enrichedBasket.push({
                count: item.count,
                productId: null,
                packageId: pkg._id,
                currentPrice: price,
                currentDiscount,
                itemTotal: finalPrice,
                itemDiscount: discountAmountPerUnit * item.count,
                itemWeight: weight
              });
            }
          });
        }

        // محاسبه هزینه ارسال
        const shippingCostDoc = await ShippingCost.findOne({ type: shipment });
        let shippingCost = 0;
        if (shippingCostDoc) {
          shippingCost = shippingCostDoc.cost + (shippingCostDoc.costPerKg * totalWeight / 1000);
        } else {
          shippingCost = (totalWeight * 10) + 16000;
        }

        const grandTotal = total + shippingCost;
        const finalDiscountAmount = (shipment === "پست" ? grandTotal : total) * (discountAmount / 100);
        const amountInRial = ((shipment === "پست" ? grandTotal : total) - finalDiscountAmount) * 10;

        // ایجاد پرداخت در زرین‌پال
        const payment = await createpayment({
          amountInRial,
          mobile: User.phone,
          desc: `سفارش با شناسه ${User._id}`
        });

        // ایجاد Order (اصلاح شده برای ذخیره packageId)
        const validOrderProducts = enrichedBasket.map((p) => ({
          count: p.count,
          productId: p.productId || null,
          packageId: p.packageId || null,
          price: p.currentPrice,
          discount: p.currentDiscount
        }));

        await Order.create({
          userId: User._id,
          products: validOrderProducts,
          submition: shipment,
          totalPrice: amountInRial,
          totalWeight: totalWeight,
          discount: totalDiscount + finalDiscountAmount,
          discountCode: usedDiscountCode,
          authority: payment.authority,
        });

        return {
          authority: payment.authority,
          paymentURL: payment.paymentURL,
          success: true,
          message: "پرداخت با موفقیت ایجاد شد"
        };

      } catch (error) {
        console.error('Error in createCheckoutPayment:', error);
        throw new Error(error);
      }
    }
  }
};

module.exports = checkoutResolvers; 