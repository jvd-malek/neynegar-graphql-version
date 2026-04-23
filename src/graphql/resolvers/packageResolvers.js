const Package = require("../../models/Package");

const packageResolvers = {
  Query: {
    packages: async (_, { page = 1, limit = 10, category, state, search }) => {
      try {
        const query = {};
        if (category) query.category = category;
        if (state) query.state = state;
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { desc: { $regex: search, $options: "i" } },
            { tags: { $in: [new RegExp(search, "i")] } },
          ];
        }

        const skip = (page - 1) * limit;
        const packages = await Package.find(query)
          .populate("products.product")
          .sort({ popularity: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await Package.countDocuments(query);

        return {
          packages,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total,
        };
      } catch (error) {
        throw new Error(`خطا در دریافت بسته‌ها: ${error.message}`);
      }
    },

    package: async (_, { id }) => {
      try {
        const pkg = await Package.findById(id)
          .populate("products.product")

        if (!pkg) throw new Error("بسته مورد نظر یافت نشد");
        return pkg;
      } catch (error) {
        throw new Error(`خطا در دریافت بسته: ${error.message}`);
      }
    },

    packagesByCategory: async (_, { category, limit = 10 }) => {
      try {
        const query = { category, state: "active" };

        const packages = await Package.find(query)
          .populate("products.product")
          .sort({ popularity: -1, createdAt: -1 })
          .limit(limit);

        return packages;
      } catch (error) {
        throw new Error(`خطا در دریافت بسته‌های دسته‌بندی: ${error.message}`);
      }
    },
  },

  Mutation: {
    createPackage: async (_, { input }, { user }) => {
      try {
        if (!user || !["admin", "owner"].includes(user.status))
          throw new Error("شما مجاز به ایجاد بسته نیستید");

        const pkgData = {
          ...input,
          cover: input.cover || '',
          images: input.images || []
        };

        const pkg = new Package(pkgData);
        const savedPkg = await pkg.save();
        return await savedPkg.populate("products.product")
      } catch (error) {
        throw new Error(`خطا در ایجاد بسته: ${error.message}`);
      }
    },

    updatePackage: async (_, { id, input }, { user }) => {
      try {
        if (!user || !["admin", "owner"].includes(user.status))
          throw new Error("شما مجاز به ویرایش بسته نیستید");

        const pkg = await Package.findByIdAndUpdate(id, input, { new: true });
        if (!pkg) throw new Error("بسته یافت نشد");

        return await pkg.populate("products.product");
      } catch (error) {
        throw new Error(`خطا در ویرایش بسته: ${error.message}`);
      }
    },

    deletePackage: async (_, { id }, { user }) => {
      try {
        if (!user || !["admin", "owner"].includes(user.status))
          throw new Error("شما مجاز به حذف بسته نیستید");

        const deleted = await Package.findByIdAndDelete(id);
        if (!deleted) throw new Error("بسته یافت نشد");

        return true;
      } catch (error) {
        throw new Error(`خطا در حذف بسته: ${error.message}`);
      }
    },

    addProductToPackage: async (_, { packageId, input }, { user }) => {
      try {
        if (!user || !["admin", "owner"].includes(user.status))
          throw new Error("شما مجاز به افزودن محصول نیستید");

        const pkg = await Package.findById(packageId);
        if (!pkg) throw new Error("بسته یافت نشد");

        const existing = pkg.products.find(
          (p) => p.product.toString() === input.product
        );

        if (existing) existing.quantity += input.quantity || 1;
        else pkg.products.push({ product: input.product, quantity: input.quantity || 1 });

        await pkg.save();
        return await pkg.populate("products.product");
      } catch (error) {
        throw new Error(`خطا در افزودن محصول: ${error.message}`);
      }
    },

    removeProductFromPackage: async (_, { packageId, productId }, { user }) => {
      try {
        if (!user || !["admin", "owner"].includes(user.status))
          throw new Error("شما مجاز به حذف محصول نیستید");

        const pkg = await Package.findById(packageId);
        if (!pkg) throw new Error("بسته یافت نشد");

        pkg.products = pkg.products.filter(
          (p) => p.product.toString() !== productId
        );

        await pkg.save();
        return await pkg.populate("products.product");
      } catch (error) {
        throw new Error(`خطا در حذف محصول: ${error.message}`);
      }
    },
  }
};

module.exports = packageResolvers;
