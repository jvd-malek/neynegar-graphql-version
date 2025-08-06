const Course = require('../../models/Course');
const Product = require('../../models/Product');

const courseResolvers = {
  Query: {
    courses: async (_, { page = 1, limit = 10, search = '' }) => {
      try {
        const skip = (page - 1) * limit;
        // ساخت query جستجو
        const searchQuery = search ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { desc: { $regex: search, $options: 'i' } }
          ]
        } : {};
        const [courses, total] = await Promise.all([
          Course.find(searchQuery)
            .populate('prerequisites')
            .populate('articleId') // اضافه شد
            .populate('relatedProducts')
            .skip(skip)
            .limit(limit),
          Course.countDocuments(searchQuery)
        ]);
        return {
          courses,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (err) {
        throw new Error('خطا در دریافت لیست دوره‌ها: ' + err.message);
      }
    },
    course: async (_, { id }) => {
      try {
        return await Course.findById(id)
          .populate('prerequisites')
          .populate('articleId') // اضافه شد
          .populate('relatedProducts');
      } catch (err) {
        throw new Error('خطا در دریافت دوره: ' + err.message);
      }
    },
    coursesByCategory: async (_, { category }) => {
      try {
        // اضافه کردن دوره‌ها فقط با id و title و desc و populate مقاله مرتبط
        let courses = await Course.find({ category })
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
              .select('_id title desc price discount popularity cover brand showCount majorCat minorCat')
              .sort({ _id: -1 })
              .limit(10)
              .lean();
          }
          return { ...course, relatedProducts };
        }));
        return courses
      } catch (err) {
        throw new Error('خطا در دریافت دوره‌های این دسته‌بندی: ' + err.message);
      }
    }
  },

  Mutation: {
    createCourse: async (_, { input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');
      // اعتبارسنجی cover و images
      if (input.images && input.cover && input.images.includes(input.cover)) {
        throw new Error('تصاویر نمی‌توانند شامل تصویر اصلی باشند');
      }
      // اعتبارسنجی sections
      if (input.sections) {
        input.sections.forEach(section => {
          if (!section.title || !section.txt) {
            throw new Error('هر بخش باید عنوان و متن داشته باشد');
          }
          if (!Array.isArray(section.txt)) {
            throw new Error('txt هر بخش باید آرایه‌ای از رشته‌ها باشد');
          }
          if (section.images && !Array.isArray(section.images)) {
            throw new Error('images هر بخش باید آرایه‌ای از عدد باشد');
          }
        });
      }
      try {
        const course = new Course(input);
        if (input.relatedProducts) course.relatedProducts = input.relatedProducts;
        await course.save();
        return await Course.findById(course._id)
          .populate('prerequisites')
          .populate('articleId') // اضافه شد
          .populate('relatedProducts');
      } catch (err) {
        throw new Error('خطا در ایجاد دوره: ' + err.message);
      }
    },

    updateCourse: async (_, { id, input }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');

      // اعتبارسنجی cover و images
      if (input.images && input.cover && input.images.includes(input.cover)) {
        throw new Error('تصاویر نمی‌توانند شامل تصویر اصلی باشند');
      }
      // اعتبارسنجی sections
      if (input.sections) {
        input.sections.forEach(section => {
          if (!section.title || !section.txt) {
            throw new Error('هر بخش باید عنوان و متن داشته باشد');
          }
          if (!Array.isArray(section.txt)) {
            throw new Error('txt هر بخش باید آرایه‌ای از رشته‌ها باشد');
          }
          if (section.images && !Array.isArray(section.images)) {
            throw new Error('images هر بخش باید آرایه‌ای از عدد باشد');
          }
        });
      }
      try {
        const updated = await Course.findByIdAndUpdate(id, input, { new: true });
        if (input.relatedProducts) updated.relatedProducts = input.relatedProducts;
        await updated.save();
        return await Course.findById(id)
          .populate('prerequisites')
          .populate('articleId') // اضافه شد
          .populate('relatedProducts');
      } catch (err) {
        throw new Error('خطا در ویرایش دوره: ' + err.message);
      }
    },

    deleteCourse: async (_, { id }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');

      try {
        const result = await Course.findByIdAndDelete(id);
        return !!result;
      } catch (err) {
        throw new Error('خطا در حذف دوره: ' + err.message);
      }
    },
    addSectionToCourse: async (_, { courseId, section }, { user }) => {
      if (!user || (user.status !== 'admin' && user.status !== 'owner')) throw new Error('Unauthorized');

      try {
        const course = await Course.findById(courseId);
        if (!course) throw new Error('Course not found');
        course.sections.push(section);
        await course.save();
        return await Course.findById(courseId)
          .populate('prerequisites')
          .populate('articleId'); // اضافه شد
      } catch (err) {
        throw new Error('خطا در افزودن سکشن: ' + err.message);
      }
    },
    updateCourseViews: async (_, { courseId, views }) => {
      try {
        const course = await Course.findByIdAndUpdate(
          courseId,
          { views },
          { new: true }
        );
        if (!course) throw new Error('Course not found');
        return course;
      } catch (err) {
        throw new Error('خطا در به‌روزرسانی بازدید: ' + err.message);
      }
    }
  }
};

module.exports = courseResolvers; 