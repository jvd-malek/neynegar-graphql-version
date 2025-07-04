const Article = require('../../models/Article');
const { deleteFile, deleteFiles } = require('../../utils/fileUpload');

const articleResolvers = {
    Query: {
        articles: async (_, { page = 1, limit = 10, search = '' }) => {
            const skip = (page - 1) * limit;

            // Create search query
            const searchQuery = search ? {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { desc: { $regex: search, $options: 'i' } }
                ]
            } : {};

            const [articles, total] = await Promise.all([
                Article.find(searchQuery)
                    .populate('authorId', '_id firstname lastname fullName')
                    .skip(skip)
                    .limit(limit),
                Article.countDocuments(searchQuery)
            ]);

            return {
                articles,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            };
        },
        article: async (_, { id }) => {
            return await Article.findById(id)
                .populate('authorId', '_id firstname lastname fullName')
        },
        articlesByAuthor: async (_, { authorId }) => {
            return await Article.find({ authorId });
        },
        articlesByCategory: async (_, { majorCat, minorCat, page = 1, limit = 10, search = '', sort = 'latest', cat = 'همه' }) => {
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
                    query.minorCat = cat;
                }

                const [articles, total] = await Promise.all([
                    Article.find(query)
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Article.countDocuments(query)
                ]);

                return {
                    articles,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    total
                };
            } catch (error) {
                throw new Error("خطا در دریافت مقالات");
            }
        },
        searchArticles: async (_, { query, page = 1, limit = 10 }) => {
            try {
                const skip = (page - 1) * limit;
                const searchQuery = {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { desc: { $regex: query, $options: 'i' } }
                    ]
                };

                const [articles, total] = await Promise.all([
                    Article.find(searchQuery)
                        .sort({ showCount: -1, _id: -1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Article.countDocuments(searchQuery)
                ]);

                return {
                    articles,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    total
                };
            } catch (error) {
                throw new Error("خطا در جستجوی مقالات");
            }
        }
    },

    Mutation: {
        createArticle: async (_, { input }, { user }) => {
            console.log('Creating article with input:', input);

            if (!user) throw new Error("Unauthorized")
            if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

            try {
                const articleData = {
                    ...input,
                    cover: input.cover || '',
                    images: input.images || []
                };

                console.log('Creating article with data:', articleData);
                const article = new Article(articleData);
                const savedArticle = await article.save();
                console.log('article saved successfully:', savedArticle);
                return savedArticle;
            } catch (error) {
                console.error('Error creating article:', error);
                throw error;
            }
        },

        updateArticle: async (_, { id, input }, { user }) => {
            if (!user) throw new Error("Unauthorized")
            if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

            const article = await Article.findById(id);
            if (!article) {
                throw new Error("article not found");
            }

            const updatedArticle = await Article.findByIdAndUpdate(
                id,
                { $set: input },
                { new: true, runValidators: true }
            );

            return updatedArticle;
        },

        updateArticleImages: async (_, { id, input }, { user }) => {
            if (!user) throw new Error("Unauthorized")
            if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")

            try {
                const oldArticle = await Article.findById(id);
                if (!oldArticle) {
                    throw new Error("Article not found");
                }

                // حذف تصاویر قدیمی که در input جدید نیستند
                if (oldArticle.cover && oldArticle.cover !== input.cover) {
                    deleteFile(oldArticle.cover);
                }

                if (oldArticle.images && oldArticle.images.length > 0) {
                    const imagesToDelete = oldArticle.images.filter(img => !input.images.includes(img));
                    if (imagesToDelete.length > 0) {
                        deleteFiles(imagesToDelete);
                    }
                }

                // آپدیت محصول با آدرس‌های جدید
                const updatedArticle = await Article.findByIdAndUpdate(
                    id,
                    {
                        $set: {
                            cover: input.cover,
                            images: input.images
                        }
                    },
                    { new: true, runValidators: true }
                );

                return updatedArticle;
            } catch (error) {
                throw new Error(error.message);
            }
        },

        deleteArticle: async (_, { id }, { user }) => {
            if (!user) throw new Error("Unauthorized")
            if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")


            const article = await Article.findById(id);
            if (article && article.images) {
                deleteFiles(article.images);
            }
            if (article && article.cover) {
                deleteFile(article.cover);
            }
            const result = await Article.findByIdAndDelete(id);
            return !!result;
        },

        updateArticlePopularity: async (_, { id, popularity }, { user }) => {
            if (!user) throw new Error("Unauthorized")

            return await Article.findByIdAndUpdate(
                id,
                { popularity },
                { new: true }
            );
        },

        incrementArticleViews: async (_, { id }) => {
            try {
                const article = await Article.findByIdAndUpdate(
                    id,
                    { $inc: { views: 1 } },
                    { new: true }
                );
                return article;
            } catch (error) {
                throw new Error("خطا در افزایش تعداد بازدید");
            }
        }
    }
};

module.exports = articleResolvers; 