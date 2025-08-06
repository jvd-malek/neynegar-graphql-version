const Product = require('../../models/Product');
const Article = require('../../models/Article');
const GroupDiscount = require('../../models/GroupDiscount');
const Course = require('../../models/Course');
const ShippingCost = require('../../models/ShippingCost');
const { deleteFile, deleteFiles } = require('../../utils/fileUpload');

const productResolvers = {
  Query: {
    homePageData: async () => {
      try {
        const caliBooks = await Product.find({ majorCat: "کتاب", minorCat: "خوشنویسی", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
          .sort({ _id: -1 }).limit(10).lean();

        const discountProducts = await Product.find({
          $expr: {
            $and: [
              { $gt: [{ $arrayElemAt: ["$discount.discount", -1] }, 0] },
              { $gt: [{ $arrayElemAt: ["$discount.date", -1] }, Date.now()] }
            ]
          },
          showCount: { $gt: 0 }
        })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const paintBooks = await Product.find({ majorCat: "کتاب", minorCat: "طراحی و نقاشی", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const traditionalBooks = await Product.find({ majorCat: "کتاب", minorCat: "هنرهای سنتی", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const gallery = await Product.find({ majorCat: "گالری", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const articles = await Article.find({})
          .populate('authorId', '_id firstname lastname fullName')
          .sort({ _id: -1 }).limit(3).lean();

        // اضافه کردن دوره‌ها فقط با id و title و desc و populate مقاله مرتبط
        let courses = await Course.find({})
          .select('_id title desc articleId category relatedProducts')
          .populate('articleId', '_id title desc')
          .populate('relatedProducts')
          .sort({ popularity: -1 })
          .lean();

        // برای هر دوره، اگر relatedProducts وجود داشت همان را بگذار، اگر نه محصولات مرتبط با دسته‌بندی را پیدا کن (حداکثر 10 عدد)
        courses = await Promise.all(courses.map(async (course) => {
          let relatedProducts = course.relatedProducts;
          if (!relatedProducts || relatedProducts.length === 0) {
            relatedProducts = await Product.find({
              brand: course.category
            })
              .sort({ _id: -1 })
              .limit(10)
              .lean();
          }
          return { ...course, relatedProducts };
        }));

        // اضافه کردن تخفیف‌های گروهی فعال
        const now = Date.now();
        const groupDiscounts = await GroupDiscount.find({
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now }
        }).sort({ startDate: -1 }).lean();

        return {
          caliBooks,
          paintBooks,
          gallery,
          traditionalBooks,
          articles,
          discountProducts,
          groupDiscounts,
          courses
        };
      } catch (error) {
        throw new Error("Database error");
      }
    },
    products: async (_, { page = 1, limit = 10, search = '' }) => {
      const skip = (page - 1) * limit;

      // Create search query
      const searchQuery = search ? {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { desc: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { publisher: { $regex: search, $options: 'i' } }
        ]
      } : {};

      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .populate('authorId', '_id firstname lastname fullName')
          .skip(skip)
          .limit(limit),
        Product.countDocuments(searchQuery)
      ]);

      return {
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    product: async (_, { id }) => {
      return await Product.findById(id).populate("authorId")
        .populate("authorArticleId", "_id desc")
        .populate("publisherArticleId", "_id desc")
        .populate("productArticleId", "_id desc")
        .populate("comments")
        .populate({
          path: "comments",
          populate: {
            path: "userId"
          }
        })
        .populate({
          path: "comments",
          populate: {
            path: "replies.userId"
          }
        })
        .exec();
    },
    // ... existing code ...
    productsByCategory: async (_, { majorCat, minorCat, page = 1, limit = 10, search = '', sort = 'latest', cat = 'همه' }) => {
      try {
        const skip = (page - 1) * limit;
        const now = Date.now();

        // ساخت query اولیه
        let query = { majorCat };
        if (minorCat) query.minorCat = minorCat;

        // اضافه کردن فیلتر جستجو
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { desc: { $regex: search, $options: 'i' } }
          ];
        }

        // اضافه کردن فیلتر دسته‌بندی
        if (cat !== 'همه') {
          if (minorCat) {
            query.brand = cat;
          } else {
            query.minorCat = cat;
          }
        }

        // ساخت شیء مرتب‌سازی
        const sortObj = (() => {
          switch (sort) {
            case 'expensive':
              return { finalPrice: -1, showCount: -1 };
            case 'cheap':
              return { finalPrice: 1, showCount: -1 };
            case 'popular':
              return { popularity: -1, showCount: -1 };
            case 'offers':
              return { discountPercent: -1, showCount: -1 };
            default:
              return { _id: -1, showCount: -1 }; // جدیدترین
          }
        })();

        // pipeline
        const pipeline = [
          { $match: query },
          {
            $addFields: {
              lastPrice: { $ifNull: [{ $arrayElemAt: ["$price.price", -1] }, 0] },
              lastDiscount: { $ifNull: [{ $arrayElemAt: ["$discount", -1] }, { discount: 0, date: 0 }] },
            }
          },
          {
            $addFields: {
              discountPercent: {
                $cond: [
                  { $gt: ["$lastDiscount.date", now] },
                  "$lastDiscount.discount",
                  0
                ]
              }
            }
          },
          {
            $addFields: {
              finalPrice: {
                $cond: [
                  { $gt: ["$discountPercent", 0] },
                  {
                    $multiply: [
                      "$lastPrice",
                      { $divide: [{ $subtract: [100, "$discountPercent"] }, 100] }
                    ]
                  },
                  "$lastPrice"
                ]
              }
            }
          },
          { $sort: sortObj },
          { $skip: skip },
          { $limit: limit }
        ];

        // اجرای pipeline
        const products = await Product.aggregate(pipeline);
        // شمارش کل محصولات (بدون paginate)
        const total = await Product.countDocuments(query);

        return {
          products,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت محصولات");
      }
    },
    // ... existing code ...
    productsByAuthor: async (_, { authorId }) => {
      return await Product.find({ authorId });
    },
    productsByStatus: async (_, { status }) => {
      return await Product.find({ status });
    },
    searchProducts: async (_, { query, page = 1, limit = 10 }) => {
      try {
        const skip = (page - 1) * limit;
        const searchQuery = {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { desc: { $regex: query, $options: 'i' } }
          ]
        };

        const [products, total] = await Promise.all([
          Product.find(searchQuery)
            .sort({ showCount: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Product.countDocuments(searchQuery)
        ]);

        return {
          products,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در جستجوی محصولات");
      }
    },
    suggestedProducts: async (_, { majorCat, minorCat, cat }) => {
      try {
        if (majorCat === 'مقالات' && minorCat) {
          const products = await Product
            .find({
              $or: [
                { authorArticleId: minorCat },
                { productArticleId: minorCat },
                { publisherArticleId: minorCat },
              ],
            })
            .select(
              '_id title desc price discount popularity cover brand majorCat minorCat authorId count showCount'
            )
            .sort({ popularity: -1, _id: -1 })
            .limit(10)
            .lean();

          // If we have less than 10 products and cat is provided, fetch additional products
          if (products.length < 10 && cat) {
            const additionalProducts = await Product
              .find({ majorCat: cat })
              .sort({ popularity: -1, _id: -1 })
              .limit(10 - products.length)
              .lean();

            return [...products, ...additionalProducts];
          }

          return products;
        }

        const products = await Product
          .find({ majorCat, minorCat })
          .select(
            '_id title desc price discount popularity cover brand majorCat minorCat authorId count showCount'
          )
          .sort({ popularity: -1, _id: -1 })
          .limit(10)
          .lean();

        // If we have less than 10 products and cat is provided, fetch additional products
        if (products.length < 10) {
          const additionalProducts = await Product
            .find({ majorCat })
            .select(
              '_id title desc price discount popularity cover brand majorCat minorCat authorId count showCount'
            )
            .sort({ popularity: -1, _id: -1 })
            .limit(10 - products.length)
            .lean();

          return [...products, ...additionalProducts];
        }

        return products;
      } catch (error) {
        throw new Error("خطا در دریافت محصولات پیشنهادی");
      }
    },
    offer: async (_, { page = 1, limit = 10 }) => {
      try {
        const skip = (page - 1) * limit;
        
        const query = {
          $expr: {
            $and: [
              { $gt: [{ $arrayElemAt: ["$discount.discount", -1] }, 0] },
              { $gt: [{ $arrayElemAt: ["$discount.date", -1] }, Date.now()] }
            ]
          },
          showCount: { $gt: 0 }
        };

        const [products, total] = await Promise.all([
          Product.find(query)
            .select("_id title desc price discount popularity cover brand showCount majorCat minorCat state")
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Product.countDocuments(query)
        ]);

        return {
          products,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت محصولات حراج");
      }
    },
    localBasket: async (_, { basket }) => {
      if (!basket || !Array.isArray(basket) || basket.length === 0) {
        return {
          user: null,
          basket: [],
          subtotal: 0,
          totalDiscount: 0,
          total: 0,
          totalWeight: 0,
          shippingCost: 0,
          grandTotal: 0,
          state: false
        };
      }

      try {
        // تبدیل ID ها به ObjectId
        const productIds = basket.map(item => item.productId);

        // دریافت محصولات از دیتابیس
        const products = await Product.find({
          _id: { $in: productIds }
        }).lean();

        let subtotal = 0;
        let totalDiscount = 0;
        let total = 0;
        let totalWeight = 0;

        const isDiscountValid = (discount) => {
          if (!discount || !discount.date) return false;
          const now = Date.now();
          const discountDate = discount.date;
          return now <= discountDate;
        };

        const enrichedBasket = basket.map(item => {
          const product = products.find(p => p._id.toString() === item.productId);

          if (!product) {
            return {
              count: item.count,
              productId: null,
              currentPrice: 0,
              currentDiscount: 0,
              itemTotal: 0,
              itemDiscount: 0,
              itemWeight: 0
            };
          }

          // دریافت آخرین قیمت و تخفیف
          const latestPriceEntry = product.price[product.price.length - 1];
          const latestDiscountEntry = product.discount[product.discount.length - 1];

          const currentPrice = latestPriceEntry?.price || 0;
          const currentDiscount = isDiscountValid(latestDiscountEntry) ? (latestDiscountEntry?.discount || 0) : 0;
          const productWeight = product.weight || 0;

          const itemDiscountAmount = currentPrice * (currentDiscount / 100);
          const itemTotal = (currentPrice - itemDiscountAmount) * item.count;
          const itemWeight = productWeight * item.count;

          subtotal += currentPrice * item.count;
          totalDiscount += itemDiscountAmount * item.count;
          total += itemTotal;
          totalWeight += itemWeight;

          return {
            count: item.count,
            productId: {
              _id: product._id.toString(),
              title: product.title,
              desc: product.desc,
              weight: product.weight,
              cover: product.cover,
              brand: product.brand,
              status: product.status,
              majorCat: product.majorCat,
              minorCat: product.minorCat,
              popularity: product.popularity,
              price: currentPrice,
              discount: currentDiscount,
              discountRaw: product.discount,
              showCount: product.showCount,
              totalSell: product.totalSell || 0
            },
            currentPrice,
            currentDiscount,
            itemTotal,
            itemDiscount: itemDiscountAmount * item.count,
            itemWeight
          };
        });

        // محاسبه هزینه ارسال
        const shippingType = 'پست';
        const shippingCostDoc = await ShippingCost.findOne({ type: shippingType });
        let shippingCost = 0;
        if (shippingCostDoc) {
          shippingCost = shippingCostDoc.cost + (shippingCostDoc.costPerKg * totalWeight / 1000);
        } else {
          // فرمول پیش‌فرض اگر تنظیمات ارسال موجود نباشد
          shippingCost = (totalWeight * 7) + 70000;
        }

        return {
          user: null,
          basket: enrichedBasket,
          subtotal,
          totalDiscount,
          total,
          totalWeight,
          shippingCost,
          grandTotal: total + shippingCost,
          state: true
        };
      } catch (error) {
        console.error('Error in localBasket resolver:', error);
        throw new Error("خطا در محاسبه سبد خرید محلی");
      }
    },
    outOfStockProducts: async () => {
      return await Product.find({ showCount: { $lte: 0 } })
        .populate('authorId', '_id firstname lastname fullName')
        .sort({ _id: -1 })
        .lean();
    }
  },

  Mutation: {
    createProduct: async (_, { input }, { user }) => {
      console.log('Creating product with input:', input);

      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const productData = {
          ...input,
          cover: input.cover || '',
          images: input.images || []
        };

        console.log('Creating product with data:', productData);
        const product = new Product(productData);
        const savedProduct = await product.save();
        console.log('Product saved successfully:', savedProduct);
        return savedProduct;
      } catch (error) {
        console.error('Error creating product:', error);
        throw error;
      }
    },

    updateProduct: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")
      console.log("input", input);
      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        // Prepare update data
        const updateData = {};

        // Handle basic fields
        if (input.title !== undefined) updateData.title = input.title;
        if (input.desc !== undefined) updateData.desc = input.desc;
        if (input.count !== undefined) updateData.count = input.count;
        if (input.showCount !== undefined) updateData.showCount = input.showCount;
        if (input.totalSell !== undefined) updateData.totalSell = input.totalSell;
        if (input.popularity !== undefined) updateData.popularity = input.popularity;
        if (input.authorId !== undefined) updateData.authorId = input.authorId;
        if (input.publisher !== undefined) updateData.publisher = input.publisher;
        if (input.publishDate !== undefined) updateData.publishDate = input.publishDate;
        if (input.brand !== undefined) updateData.brand = input.brand;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.state !== undefined) updateData.state = input.state;
        if (input.size !== undefined) updateData.size = input.size;
        if (input.weight !== undefined) updateData.weight = input.weight;
        if (input.majorCat !== undefined) updateData.majorCat = input.majorCat;
        if (input.minorCat !== undefined) updateData.minorCat = input.minorCat;
        if (input.cover !== undefined) updateData.cover = input.cover;
        if (input.images !== undefined) updateData.images = input.images;

        // Handle price history
        if (input.price) {
          const newPriceEntry = {
            price: input.price.price,
            date: input.price.date
          };
          if (!updateData.$push) updateData.$push = {};
          updateData.$push.price = newPriceEntry;
        }

        // Handle cost history
        if (input.cost) {
          const newCostEntry = {
            cost: input.cost.cost,
            count: input.cost.count,
            date: input.cost.date
          };
          if (!updateData.$push) updateData.$push = {};
          updateData.$push.cost = newCostEntry;
        }

        // Handle discount history
        if (input.discount) {
          const newDiscountEntry = {
            discount: input.discount.discount,
            date: input.discount.date * 24 * 60 * 60 * 1000 + Date.now()
          };
          if (!updateData.$push) updateData.$push = {};
          updateData.$push.discount = newDiscountEntry;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
            populate: [
              { path: 'authorId', select: '_id firstname lastname fullName' },
              { path: 'authorArticleId', select: '_id title desc' },
              { path: 'publisherArticleId', select: '_id title desc' },
              { path: 'productArticleId', select: '_id title desc' }
            ]
          }
        );

        if (!updatedProduct) {
          throw new Error("Failed to update product");
        }

        return updatedProduct;
      } catch (error) {
        console.error('Error updating product:', error);
        throw new Error(error.message || "خطا در بروزرسانی محصول");
      }
    },

    updateProductImages: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const oldProduct = await Product.findById(id);
        if (!oldProduct) {
          throw new Error("Product not found");
        }

        // حذف تصاویر قدیمی که در input جدید نیستند
        if (oldProduct.cover && oldProduct.cover !== input.cover) {
          deleteFile(oldProduct.cover);
        }

        if (oldProduct.images && oldProduct.images.length > 0) {
          const imagesToDelete = oldProduct.images.filter(img => !input.images.includes(img));
          if (imagesToDelete.length > 0) {
            deleteFiles(imagesToDelete);
          }
        }

        // آپدیت محصول با آدرس‌های جدید
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            $set: {
              cover: input.cover,
              images: input.images
            }
          },
          { new: true, runValidators: true }
        );

        return updatedProduct;
      } catch (error) {
        throw new Error(error.message);
      }
    },

    deleteProduct: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const product = await Product.findById(id);
      if (product && product.images) {
        deleteFiles(product.images);
      }
      if (product && product.cover) {
        deleteFile(product.cover);
      }
      const result = await Product.findByIdAndDelete(id);
      return !!result;
    },

    updateProductPrice: async (_, { id, price }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        const date = new Date().toISOString();
        product.price.push({
          price,
          date
        });
        return await product.save();
      } catch (error) {
        console.error('Error updating product price:', error);
        throw new Error(error.message || "خطا در بروزرسانی قیمت محصول");
      }
    },

    updateProductCost: async (_, { id, cost, count }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        const date = new Date().toISOString();
        product.cost.push({
          cost,
          count,
          date
        });
        return await product.save();
      } catch (error) {
        console.error('Error updating product cost:', error);
        throw new Error(error.message || "خطا در بروزرسانی هزینه محصول");
      }
    },

    updateProductDiscount: async (_, { id, discount }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        // The discount parameter is the discount percentage
        // We'll set the discount to expire in 30 days by default
        const discountEndDate = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days from now

        product.discount.push({
          discount: discount,
          date: discountEndDate
        });
        return await product.save();
      } catch (error) {
        console.error('Error updating product discount:', error);
        throw new Error(error.message || "خطا در بروزرسانی تخفیف محصول");
      }
    },

    updateProductStatus: async (_, { id, status }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        const product = await Product.findByIdAndUpdate(
          id,
          { status },
          { new: true }
        );

        if (!product) {
          throw new Error("Product not found");
        }

        return product;
      } catch (error) {
        console.error('Error updating product status:', error);
        throw new Error(error.message || "خطا در بروزرسانی وضعیت محصول");
      }
    }
  }
};

module.exports = productResolvers; 