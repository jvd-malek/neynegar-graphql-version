const Product = require('../../models/Product');
const Article = require('../../models/Article');
const GroupDiscount = require('../../models/GroupDiscount');
const Course = require('../../models/Course');
const ShippingCost = require('../../models/ShippingCost');
const { deleteFile, deleteFiles, getActualFilePath, exploreDirectory } = require('../../utils/fileUpload');
const path = require('path'); // Added for path.join
const Package = require("../../models/Package");

// تابع تبدیل اعداد فارسی به انگلیسی
const convertPersianToEnglishNumbers = (text) => {
  if (!text) return text;

  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  let result = text;
  persianNumbers.forEach((persianNum, index) => {
    result = result.replace(new RegExp(persianNum, 'g'), englishNumbers[index]);
  });

  return result;
};

// تابع ایجاد کوئری جستجو با پشتیبانی از اعداد فارسی و انگلیسی
const createSearchQuery = (searchText) => {
  if (!searchText) return {};

  // تبدیل اعداد فارسی به انگلیسی
  const englishSearch = convertPersianToEnglishNumbers(searchText);

  // ایجاد کوئری که هم متن اصلی و هم نسخه تبدیل شده را جستجو کند
  const searchQueries = [];

  // جستجو در متن اصلی (ممکن است فارسی باشد)
  searchQueries.push(
    { title: { $regex: searchText, $options: 'i' } },
    { desc: { $regex: searchText, $options: 'i' } },
    { brand: { $regex: searchText, $options: 'i' } },
    { publisher: { $regex: searchText, $options: 'i' } }
  );

  // جستجو در نسخه تبدیل شده به انگلیسی (اگر متفاوت باشد)
  if (englishSearch !== searchText) {
    searchQueries.push(
      { title: { $regex: englishSearch, $options: 'i' } },
      { desc: { $regex: englishSearch, $options: 'i' } },
      { brand: { $regex: englishSearch, $options: 'i' } },
      { publisher: { $regex: englishSearch, $options: 'i' } }
    );
  }

  return {
    $or: searchQueries
  };
};

const productResolvers = {
  Query: {
    homePageData: async () => {
      try {
        const caliBooks = await Product.find({ majorCat: "کتاب", minorCat: "خوشنویسی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat")
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
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const paintBooks = await Product.find({ majorCat: "کتاب", minorCat: "طراحی و نقاشی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const traditionalBooks = await Product.find({ majorCat: "کتاب", minorCat: "هنرهای سنتی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 }).limit(10).lean();

        const gallery = await Product.find({ majorCat: "گالری", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
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
    homePageHero: async () => {
      try {
        const caliBooks = await Product.find({ majorCat: "کتاب", minorCat: "خوشنویسی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        const discountProducts = await Product.find({
          $expr: {
            $and: [
              { $gt: [{ $arrayElemAt: ["$discount.discount", -1] }, 0] },
              { $gt: [{ $arrayElemAt: ["$discount.date", -1] }, Date.now()] }
            ]
          },
          showCount: { $gt: 0 }
        })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        // اضافه کردن تخفیف‌های گروهی فعال
        const now = Date.now();
        const groupDiscounts = await GroupDiscount.find({
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now }
        }).sort({ startDate: -1 }).lean();

        return { caliBooks, discountProducts, groupDiscounts };
      } catch (err) {
        console.error(err);
        throw new Error("homePageHero Database error");
      }
    },
    homePageBooks: async () => {
      try {
        const paintBooks = await Product.find({ majorCat: "کتاب", minorCat: "طراحی و نقاشی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        const traditionalBooks = await Product.find({ majorCat: "کتاب", minorCat: "هنرهای سنتی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        const gallery = await Product.find({ majorCat: "گالری", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        const tools = await Product.find({ majorCat: "لوازم خوشنویسی", showCount: { $gt: 0 } })
          .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
          .sort({ _id: -1 })
          .limit(10)
          .lean();

        return { paintBooks, traditionalBooks, gallery, tools };
      } catch (err) {
        console.error(err);
        throw new Error("homePageBooks Database error");
      }
    },
    homePageArticles: async () => {
      try {
        const articles = await Article.find({})
          .populate('authorId', '_id firstname lastname fullName')
          .sort({ _id: -1 })
          .limit(3)
          .lean();

        return { articles };
      } catch (err) {
        console.error(err);
        throw new Error("Articles Database error");
      }
    },
    homePageCourses: async () => {
      try {
        let courses = await Course.find({})
          .select('_id title desc articleId category relatedProducts')
          .populate('articleId', '_id title desc')
          .populate('relatedProducts', "_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
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

        return { courses };
      } catch (err) {
        console.error(err);
        throw new Error("Courses Database error");
      }
    },
    products: async (_, { page = 1, limit = 10, search = '' }) => {
      const skip = (page - 1) * limit;

      // Create search query with Persian/English number support
      const searchQuery = createSearchQuery(search);

      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .populate('authorId', '_id firstname lastname fullName')
          .sort({ updatedAt: -1, createdAt: -1 }) // مرتب‌سازی بر اساس جدیدترین محصولات (اول updatedAt، سپس createdAt)
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
    allProducts: async (_, { page = 1, limit = 100 }) => {
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find({})
          .populate('authorId', '_id firstname lastname fullName')
          .sort({ updatedAt: -1, createdAt: -1 }) // مرتب‌سازی بر اساس جدیدترین محصولات (اول updatedAt، سپس createdAt)
          .skip(skip)
          .limit(limit),
        Product.countDocuments({})
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
        .populate("authorArticleId", "_id title desc")
        .populate("publisherArticleId", "_id title desc")
        .populate("productArticleId", "_id title desc")
        .populate("faqTemplateIds")
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
    productsByCategory: async (_, { majorCat, minorCat, page = 1, limit = 10, search = '', sort = 'latest', cat = 'همه' }) => {
      try {
        const skip = (page - 1) * limit;
        const now = Date.now();

        // ساخت query اولیه
        let query = { majorCat };
        if (minorCat) query.minorCat = minorCat;

        // اضافه کردن فیلتر جستجو با پشتیبانی از اعداد فارسی و انگلیسی
        if (search) {
          const searchQuery = createSearchQuery(search);
          query.$or = searchQuery.$or;
        }

        // اضافه کردن فیلتر دسته‌بندی
        if (cat !== 'همه') {
          if (minorCat) {
            query.brand = cat;
          } else {
            query.minorCat = cat;
          }
        }

        // ساخت شیء مرتب‌سازی با اولویت محصولات موجود
        const sortObj = (() => {
          const baseSort = { showCount: -1 };

          switch (sort) {
            case 'expensive':
              return {
                availabilityPriority: 1, // محصولات موجود اول
                finalPrice: -1,
                ...baseSort
              };
            case 'cheap':
              return {
                availabilityPriority: 1, // محصولات موجود اول
                finalPrice: 1,
                ...baseSort
              };
            case 'popular':
              return {
                availabilityPriority: 1, // محصولات موجود اول
                popularity: -1,
                ...baseSort
              };
            case 'offers':
              return {
                availabilityPriority: 1, // محصولات موجود اول
                discountPercent: -1,
                ...baseSort
              };
            default:
              return {
                availabilityPriority: 1, // محصولات موجود اول
                _id: -1,
                ...baseSort
              }; // جدیدترین
          }
        })();

        // pipeline
        const pipeline = [
          { $match: query },
          {
            $addFields: {
              lastPrice: { $ifNull: [{ $arrayElemAt: ["$price.price", -1] }, 0] },
              lastDiscount: { $ifNull: [{ $arrayElemAt: ["$discount", -1] }, { discount: 0, date: 0 }] },
              // اولویت‌بندی: active + موجودی، سپس سایر حالات
              availabilityPriority: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$state", "active"] },
                      { $gt: ["$showCount", 0] }
                    ]
                  },
                  0, // محصولات active با موجودی - بالاترین اولویت
                  {
                    $cond: [
                      { $gt: ["$showCount", 0] },
                      1, // محصولات با موجودی اما غیر active
                      2  // محصولات بدون موجودی - پایین‌ترین اولویت
                    ]
                  }
                ]
              }
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
    productsByAuthor: async (_, { authorId }) => {
      return await Product.find({ authorId });
    },
    productsByStatus: async (_, { status }) => {
      return await Product.find({ status });
    },
    searchProducts: async (_, { query, page = 1, limit = 10 }) => {
      try {
        const skip = (page - 1) * limit;
        const searchQuery = createSearchQuery(query);
        const now = Date.now();

        // pipeline برای جستجو با اولویت‌بندی
        const pipeline = [
          { $match: searchQuery },
          {
            $addFields: {
              lastPrice: { $ifNull: [{ $arrayElemAt: ["$price.price", -1] }, 0] },
              lastDiscount: { $ifNull: [{ $arrayElemAt: ["$discount", -1] }, { discount: 0, date: 0 }] },
              // اولویت‌بندی: active + موجودی، سپس سایر حالات
              availabilityPriority: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$state", "active"] },
                      { $gt: ["$showCount", 0] }
                    ]
                  },
                  0, // محصولات active با موجودی - بالاترین اولویت
                  {
                    $cond: [
                      { $gt: ["$showCount", 0] },
                      1, // محصولات با موجودی اما غیر active
                      2  // محصولات بدون موجودی - پایین‌ترین اولویت
                    ]
                  }
                ]
              }
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
          {
            $sort: {
              availabilityPriority: 1, // اولویت‌بندی بر اساس موجودی و state
              _id: -1,
              showCount: -1
            }
          },
          { $skip: skip },
          { $limit: limit }
        ];

        const [products, total] = await Promise.all([
          Product.aggregate(pipeline),
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
              showCount: { $gt: 0 }
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
              .find({ majorCat: cat, showCount: { $gt: 0 } })
              .sort({ popularity: -1, _id: -1 })
              .limit(10 - products.length)
              .lean();

            return [...products, ...additionalProducts];
          }

          return products;
        }

        const products = await Product
          .find({ majorCat, minorCat, showCount: { $gt: 0 } })
          .select(
            '_id title desc price finalPrice discount state popularity cover brand majorCat minorCat authorId count showCount'
          )
          .sort({ popularity: -1, _id: -1 })
          .limit(10)
          .lean();

        // If we have less than 10 products and cat is provided, fetch additional products
        if (products.length < 10) {
          const additionalProducts = await Product
            .find({ majorCat, showCount: { $gt: 0 } })
            .select(
              '_id title desc price finalPrice discount popularity cover brand majorCat minorCat authorId count showCount'
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
            .select("_id title desc price finalPrice discount popularity cover brand showCount majorCat minorCat state")
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
        // جداسازی محصولات و پکیج‌ها
        const productItems = basket.filter(item => item.productId);
        const packageItems = basket.filter(item => item.packageId);

        // آرایه‌ای برای نگهداری آیتم‌های ناموجود
        const unavailableItems = [];

        let subtotal = 0;
        let totalDiscount = 0;
        let total = 0;
        let totalWeight = 0;

        const enrichedBasket = [];


        // -----------------------------------------------------
        // 1) PRODUCT ITEMS
        // -----------------------------------------------------
        if (productItems.length > 0) {
          const productIds = productItems.map(item => item.productId);
          const products = await Product.find({ _id: { $in: productIds } });

          // ساخت مپ برای دسترسی سریع
          const productMap = {};
          products.forEach(p => { productMap[p._id.toString()] = p; });

          for (const item of productItems) {
            const product = productMap[item.productId.toString()];

            // 🚫 چک موجودی: اگر محصول ناموجود یا showCount صفره
            if (!product || product.showCount <= 0) {
              unavailableItems.push({
                type: 'product',
                id: item.productId,
                title: product?.title || 'محصول'
              });
              continue;
            }

            // 📊 چک تعداد: اگر تعداد درخواستی بیشتر از موجودیه
            let finalCount = item.count;
            if (item.count > product.showCount) {
              finalCount = product.showCount;
            }


            const currentPrice = product.currentPrice || 0;
            const currentDiscount = product.currentDiscount || 0;
            const productWeight = product.weight || 0;

            const discountAmountPerUnit = currentPrice * (currentDiscount / 100);
            const itemTotalPrice = currentPrice * finalCount;
            const itemTotalDiscount = discountAmountPerUnit * finalCount;
            const finalItemPrice = product.finalPrice * finalCount;
            const itemWeight = productWeight * finalCount;

            subtotal += itemTotalPrice;
            totalDiscount += itemTotalDiscount;
            total += finalItemPrice;
            totalWeight += itemWeight;

            enrichedBasket.push({
              count: finalCount,
              productId: {
                _id: product._id,
                title: product.title,
                price: currentPrice,
                discount: currentDiscount,
                showCount: product.showCount,
                state: product.state,
                weight: product.weight,
                cover: product.cover
              },
              packageId: null,
              currentPrice,
              currentDiscount,
              itemTotal: finalItemPrice,
              itemDiscount: itemTotalDiscount,
              itemWeight
            });
          }
        }

        // -----------------------------------------------------
        // 2) PACKAGE ITEMS
        // -----------------------------------------------------
        if (packageItems.length > 0) {
          const packageIds = packageItems.map(item => item.packageId);
          const packages = await Package.find({ _id: { $in: packageIds } })
            .populate('products.product')

          // ساخت مپ برای دسترسی سریع
          const packageMap = {};
          packages.forEach(pkg => { packageMap[pkg._id.toString()] = pkg; });

          for (const item of packageItems) {
            const pkg = packageMap[item.packageId.toString()];

            // 🚫 چک موجودی پکیج
            if (!pkg || pkg.showCount <= 0) {
              unavailableItems.push({
                type: 'package',
                id: item.packageId,
                title: pkg?.title || 'پکیج'
              });
              continue;
            }

            // 📊 چک تعداد پکیج
            let finalCount = item.count;
            if (item.count > pkg.showCount) {
              finalCount = pkg.showCount;
            }

            const price = pkg.totalPrice || 0;
            const currentDiscount = pkg.currentDiscount || 0;
            const discountAmountPerUnit = price * (currentDiscount / 100);
            const itemTotalPrice = price * finalCount;
            const itemTotalDiscount = discountAmountPerUnit * finalCount;
            const finalPrice = itemTotalPrice - itemTotalDiscount;
            const weight = (pkg.totalWeight || 0) * finalCount;

            subtotal += itemTotalPrice;
            totalDiscount += itemTotalDiscount;
            total += finalPrice;
            totalWeight += weight;

            enrichedBasket.push({
              count: finalCount,
              productId: null,
              packageId: {
                _id: pkg._id.toString(),
                title: pkg.title,
                price: price,
                discount: currentDiscount,
                showCount: pkg.showCount,
                state: pkg.state,
                weight: pkg.totalWeight,
                cover: pkg.cover
              },
              currentPrice: price,
              currentDiscount,
              itemTotal: finalPrice,
              itemDiscount: itemTotalDiscount,
              itemWeight: weight
            });
          }
        }

        // اگر هیچ آیتم معتبری وجود نداشت
        if (enrichedBasket.length === 0) {
          return {
            user: null,
            basket: [],
            subtotal: 0,
            totalDiscount: 0,
            total: 0,
            totalWeight: 0,
            shippingCost: 0,
            grandTotal: 0,
            state: false,
            unavailableItems: unavailableItems.map(i => i.title)
          };
        }

        // محاسبه هزینه ارسال
        const shippingType = 'پست';
        const shippingCostDoc = await ShippingCost.findOne({ type: shippingType });
        let shippingCost = 0;
        if (shippingCostDoc) {
          shippingCost = shippingCostDoc.cost + (shippingCostDoc.costPerKg * totalWeight / 1000);
        } else {
          shippingCost = (totalWeight * 10) + 16000;
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
          state: true,
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
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      try {
        // Default article IDs to use when specific articles are not provided
        const defaultArticleIds = [
          "68b5e0ce7c34d6bfc6fc5af3", // First default article
          "6871f8b9159750ddb71f04e6", // Second default article  
          "68bb0da27c34d6bfc6003f7b"  // Third default article
        ];

        const productData = {
          ...input,
          cover: input.cover || '',
          images: input.images || [],
          features: input.features || [],
          faqTemplateIds: input.faqTemplateIds || [],
          // Set default article IDs if not provided
          authorArticleId: input.authorArticleId || defaultArticleIds[0],
          publisherArticleId: input.publisherArticleId || defaultArticleIds[1],
          productArticleId: input.productArticleId || defaultArticleIds[2]
        };

        const product = new Product(productData);
        const savedProduct = await product.save();
        return savedProduct;
      } catch (error) {
        console.error('Error creating product:', error);
        throw error;
      }
    },

    updateProduct: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

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

        // Handle features
        if (input.features !== undefined) updateData.features = input.features;

        // Handle FAQs
        if (input.faqTemplateIds !== undefined) updateData.faqTemplateIds = input.faqTemplateIds;

        // Handle article IDs with defaults
        const defaultArticleIds = [
          "68b5e0ce7c34d6bfc6fc5af3", // First default article
          "6871f8b9159750ddb71f04e6", // Second default article  
          "68bb0da27c34d6bfc6003f7b"  // Third default article
        ];

        if (input.authorArticleId !== undefined) {
          updateData.authorArticleId = input.authorArticleId || defaultArticleIds[0];
        }
        if (input.publisherArticleId !== undefined) {
          updateData.publisherArticleId = input.publisherArticleId || defaultArticleIds[1];
        }
        if (input.productArticleId !== undefined) {
          updateData.productArticleId = input.productArticleId || defaultArticleIds[2];
        }

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
        console.error('Error in updateProductImages:', error);
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
    },

    // ============ FEATURES MUTATIONS ============

    updateProductFeatures: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        // جایگزین کردن کامل features
        product.features = input.features || [];

        const updatedProduct = await product.save();

        return updatedProduct

      } catch (error) {
        console.error('Error updating product features:', error);
        throw new Error(error.message || "خطا در بروزرسانی ویژگی‌های محصول");
      }
    },

    addSingleFeature: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const product = await Product.findById(id);
        if (!product) {
          throw new Error("Product not found");
        }

        // بررسی تکراری نبودن کلید
        const existingKey = product.features.find(f => f.key === input.key);
        if (existingKey) {
          throw new Error(`ویژگی با کلید "${input.key}" قبلاً وجود دارد`);
        }

        product.features.push({
          key: input.key,
          value: input.value
        });

        const updatedProduct = await product.save();

        return updatedProduct

      } catch (error) {
        console.error('Error adding feature:', error);
        throw new Error(error.message || "خطا در اضافه کردن ویژگی");
      }
    },

    // ============ FAQ MUTATIONS ============

    updateProductFaqTemplates: async (_, { id, faqTemplateIds }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const product = await Product.findByIdAndUpdate(
          id,
          { faqTemplateIds },
          { new: true }
        ).populate('faqTemplateIds');

        if (!product) throw new Error("Product not found");
        return product;
      } catch (error) {
        throw new Error(error.message || "خطا در بروزرسانی گروه سوالات محصول");
      }
    },

    addFaqTemplateToProduct: async (_, { productId, templateId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const product = await Product.findByIdAndUpdate(
          productId,
          { $addToSet: { faqTemplateIds: templateId } },
          { new: true }
        ).populate('faqTemplateIds');

        if (!product) throw new Error("Product not found");
        return product;
      } catch (error) {
        throw new Error(error.message || "خطا در افزودن گروه سوالات به محصول");
      }
    },

    removeFaqTemplateFromProduct: async (_, { productId, templateId }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const product = await Product.findByIdAndUpdate(
          productId,
          { $pull: { faqTemplateIds: templateId } },
          { new: true }
        ).populate('faqTemplateIds');

        if (!product) throw new Error("Product not found");
        return product;
      } catch (error) {
        throw new Error(error.message || "خطا در حذف گروه سوالات از محصول");
      }
    },
  },

  Product: {
    faqs: async (product) => {
      // اگر faqTemplateIds populate شده
      if (product.faqTemplateIds && product.faqTemplateIds.length > 0) {
        const templates = product.faqTemplateIds;
        const allFaqs = [];
        templates.forEach(template => {
          if (template.faqs) {
            allFaqs.push(...template.faqs);
          }
        });
        return allFaqs;
      }

      // اگر populate نشده، خودمون fetch کنیم
      if (product.faqTemplateIds && product.faqTemplateIds.length > 0) {
        const templateIds = product.faqTemplateIds;
        const templates = await FAQTemplate.find({
          _id: { $in: templateIds },
          isActive: true
        });
        return templates.flatMap(t => t.faqs);
      }

      return [];
    }
  }
};

module.exports = productResolvers; 