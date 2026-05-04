const FAQTemplate = require('../../models/FAQ');

const faqResolvers = {
  Query: {
    faqTemplates: async (_, { category }) => {
      try {
        const query = { isActive: true };
        if (category) query.category = category;
        return await FAQTemplate.find(query).sort({ category: 1, name: 1 });
      } catch (error) {
        throw new Error("خطا در دریافت گروه‌های سوالات");
      }
    },
    
    faqTemplate: async (_, { id }) => {
      try {
        return await FAQTemplate.findById(id);
      } catch (error) {
        throw new Error("گروه سوالات یافت نشد");
      }
    },
    
    activeFaqTemplates: async () => {
      try {
        return await FAQTemplate.find({ isActive: true }).sort({ category: 1, name: 1 });
      } catch (error) {
        throw new Error("خطا در دریافت گروه‌های فعال سوالات");
      }
    }
  },

  Mutation: {
    createFAQTemplate: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const template = new FAQTemplate(input);
        return await template.save();
      } catch (error) {
        throw new Error(error.message || "خطا در ایجاد گروه سوالات");
      }
    },

    updateFAQTemplate: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const template = await FAQTemplate.findByIdAndUpdate(
          id,
          input,
          { new: true, runValidators: true }
        );
        
        if (!template) throw new Error("گروه سوالات یافت نشد");
        return template;
      } catch (error) {
        throw new Error(error.message || "خطا در بروزرسانی گروه سوالات");
      }
    },

    deleteFAQTemplate: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const result = await FAQTemplate.findByIdAndDelete(id);
        
        // حذف این template از همه محصولات
        if (result) {
          await Product.updateMany(
            { faqTemplateIds: id },
            { $pull: { faqTemplateIds: id } }
          );
        }
        
        return !!result;
      } catch (error) {
        throw new Error("خطا در حذف گروه سوالات");
      }
    },

    addFAQToTemplate: async (_, { id, question, answer }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const template = await FAQTemplate.findById(id);
        if (!template) throw new Error("گروه سوالات یافت نشد");

        // Check duplicate
        const exists = template.faqs.some(f => f.question === question);
        if (exists) throw new Error("این سوال قبلاً در این گروه وجود دارد");

        template.faqs.push({ question, answer });
        return await template.save();
      } catch (error) {
        throw new Error(error.message || "خطا در افزودن سوال");
      }
    },

    removeFAQFromTemplate: async (_, { id, questionIndex }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      try {
        const template = await FAQTemplate.findById(id);
        if (!template) throw new Error("گروه سوالات یافت نشد");

        if (questionIndex < 0 || questionIndex >= template.faqs.length) {
          throw new Error("شماره سوال نامعتبر است");
        }

        template.faqs.splice(questionIndex, 1);
        return await template.save();
      } catch (error) {
        throw new Error(error.message || "خطا در حذف سوال");
      }
    }
  }
};

module.exports = faqResolvers;