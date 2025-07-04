const Product = require('../../models/Product');
const Article = require('../../models/Article');
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
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
          .sort({ _id: -1 }).limit(10).lean();

        const paintBooks = await Product.find({ majorCat: "کتاب", minorCat: "طراحی و نقاشی", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
          .sort({ _id: -1 }).limit(10).lean();

        const traditionalBooks = await Product.find({ majorCat: "کتاب", minorCat: "هنرهای سنتی", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
          .sort({ _id: -1 }).limit(10).lean();

        const gallery = await Product.find({ majorCat: "گالری", showCount: { $gt: 0 } })
          .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
          .sort({ _id: -1 }).limit(10).lean();

        const articles = await Article.find({})
          .populate('authorId', '_id firstname lastname fullName')
          .sort({ _id: -1 }).limit(3).lean();

        return {
          caliBooks,
          paintBooks,
          gallery,
          traditionalBooks,
          articles,
          discountProducts
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
    productsByCategory: async (_, { majorCat, minorCat, page = 1, limit = 10, search = '', sort = 'latest', cat = 'همه' }) => {
      try {
        const skip = (page - 1) * limit;

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

        const [products, total] = await Promise.all([
          Product.find(query)
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
    offer: async () => {
      return await Product.find({
        $expr: {
          $and: [
            { $gt: [{ $arrayElemAt: ["$discount.discount", -1] }, 0] },
            { $gt: [{ $arrayElemAt: ["$discount.date", -1] }, Date.now()] }
          ]
        },
        showCount: { $gt: 0 }
      })
        .select("_id title desc price discount popularity cover brand showCount majorCat minorCat")
        .sort({ _id: -1 }).limit(10).lean();
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

      const product = await Product.findById(id);
      if (!product) {
        throw new Error("Product not found");
      }

      // Handle price history
      if (input.price) {
        product.price.push({
          price: input.price.price,
          date: input.price.date
        });
        delete input.price;
      }

      // Handle cost history
      if (input.cost) {
        product.cost.push({
          cost: input.cost.cost,
          count: input.cost.count ?? 1,
          date: input.cost.date
        });
        delete input.cost;
      }

      // Handle discount history
      if (input.discount) {
        product.discount.push({
          discount: input.discount.discount,
          date: input.discount.date * 24 * 60 * 60 * 1000 + Date.now()
        });
        delete input.discount;
      }

      // Set default state if not provided
      if (!input.state) {
        input.state = 'active';
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true }
      );

      return updatedProduct;
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

    updateProductPrice: async (_, { id, price }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const date = new Date()
      const product = await Product.findById(id);
      product.price.push({
        price,
        date
      });
      return await product.save();
    },

    updateProductCost: async (_, { id, cost, count }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const date = new Date()
      const product = await Product.findById(id);
      product.cost.push({
        cost,
        count,
        date
      });
      return await product.save();
    },

    updateProductDiscount: async (_, { id, discount }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      const product = await Product.findById(id);
      product.discount.push({
        discount: discount.discount,
        date: discount.date * 24 * 60 * 60 * 1000 + Date.now()
      });
      return await product.save();
    },

    updateProductStatus: async (_, { id, status }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

      return await Product.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
    }
  }
};

module.exports = productResolvers; 