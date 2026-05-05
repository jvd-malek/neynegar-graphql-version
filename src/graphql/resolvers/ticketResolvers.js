const Ticket = require('../../models/Ticket');
const Alert = require('../../models/Alert');

const ticketResolvers = {
  Query: {
    tickets: async (_, { page = 1, limit = 10, search = '' }, { user }) => {
      console.log('Tickets resolver - User:', user ? {
        id: user._id,
        status: user.status,
        name: user.name
      } : 'No user');

      if (!user) {
        console.log('Access denied: No user');
        throw new Error("Unauthorized");
      }

      if (user.status !== "admin" && user.status !== "owner") {
        console.log('Access denied: Invalid user status:', user.status);
        throw new Error("Unauthorized");
      }

      try {
        const skip = (page - 1) * limit;

        // Create search query
        const searchQuery = search ? {
          $or: [
            { 'userId.name': { $regex: search, $options: 'i' } },
            { 'userId.phone': { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { txt: { $regex: search, $options: 'i' } },
            { status: { $regex: search, $options: 'i' } }
          ]
        } : {};

        const [tickets, total] = await Promise.all([
          Ticket.find(searchQuery)
            .populate({
              path: 'userId',
              select: '_id name phone status'
            })
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          Ticket.countDocuments(searchQuery)
        ]);

        return {
          tickets,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت تیکت‌ها");
      }
    },
    ticket: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Ticket.findById(id)
        .populate({
          path: 'userId',
          select: '_id name phone status'
        });
    },
    ticketsByUser: async (_, { page = 1, limit = 10 }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const skip = (page - 1) * limit;
        const [tickets, total] = await Promise.all([
          Ticket.find({ userId: user._id })
            .populate({
              path: 'userId',
              select: '_id name phone status'
            })
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          Ticket.countDocuments({ userId: user._id })
        ]);

        return {
          tickets,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        };
      } catch (error) {
        throw new Error("خطا در دریافت تیکت‌ها");
      }
    },
    ticketsByStatus: async (_, { status }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Ticket.find({ status: { $in: Array.isArray(status) ? status : [status] } })
        .populate({
          path: 'userId',
          select: '_id name phone status'
        });
    }
  },

  Mutation: {
    createTicket: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const ticket = new Ticket({
        ...input,
        userId: user._id,
        status: 'در انتظار بررسی',
        response: ''
      });
      const savedTicket = await ticket.save();

      // ✨ آلرت شخصی: تایید ثبت تیکت
      await Alert.create({
        title: '📝 تیکتت با موفقیت ثبت شد',
        body: `سلام!\n\nتیکت "${input.title}" با موفقیت ثبت شد و در صف بررسی قرار گرفت.\n\n🎯 موضوع: ${input.title}\n📌 وضعیت: در انتظار بررسی\n\nهمکاران ما در اسرع وقت بررسی می‌کنن و پاسخ می‌دن.\n⏳ معمولاً بین ۲۴ تا ۴۸ ساعت پاسخ داده میشه.\n\n🙏 از صبوری‌ات ممنونیم!`,
        target: 'user',
        targetUsers: [user._id],
        source: 'manual',
        sourceId: savedTicket._id.toString()
      });

      return savedTicket;
    },

    updateTicket: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const updatedTicket = await Ticket.findByIdAndUpdate(id, input, { new: true })
        .populate({
          path: 'userId',
          select: '_id name phone status'
        });

      if (updatedTicket && updatedTicket.userId) {
        await Alert.create({
          title: '🔄 تیکتت بروزرسانی شد',
          body: `سلام ${updatedTicket.userId.name} عزیز!\n\nتیکت "${updatedTicket.title}" بروزرسانی شد.\n\n📌 وضعیت فعلی: ${updatedTicket.status}\n\nبرای مشاهده جزئیات به پنل کاربری مراجعه کن.`,
          target: 'user',
          targetUsers: [updatedTicket.userId._id],
          source: 'manual',
          sourceId: id
        });
      }

      return updatedTicket;
    },

    deleteTicket: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      const result = await Ticket.findByIdAndDelete(id);
      return !!result;
    },

    updateTicketStatus: async (_, { id, status }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const updatedTicket = await Ticket.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate({
        path: 'userId',
        select: '_id name phone status'
      });

      if (updatedTicket && updatedTicket.userId) {
        let alertTitle = '';
        let alertBody = '';

        switch (status) {
          case 'در حال بررسی':
            alertTitle = '🔍 تیکتت در حال بررسیه';
            alertBody = `سلام ${updatedTicket.userId.name} عزیز!\n\nتیکت "${updatedTicket.title}" توسط تیم ما در حال بررسیه.\n\nبه زودی پاسخ نهایی رو دریافت می‌کنی.`;
            break;
          case 'پاسخ داده شده':
            alertTitle = '✅ به تیکتت پاسخ داده شد';
            alertBody = `سلام ${updatedTicket.userId.name} عزیز!\n\nتیکت "${updatedTicket.title}" پاسخ داده شد.\n\nبرای مشاهده پاسخ به پنل کاربری مراجعه کن.\n\nاگه سوال دیگه‌ای داشتی، در خدمتیم!`;
            break;
          case 'بسته شده':
            alertTitle = '🔒 تیکتت بسته شد';
            alertBody = `سلام ${updatedTicket.userId.name} عزیز!\n\nتیکت "${updatedTicket.title}" بسته شد.\n\nاگه مشکلت حل نشده یا سوال جدیدی داری، می‌تونی تیکت جدیدی ثبت کنی.`;
            break;
          default:
            alertTitle = '🔄 وضعیت تیکت بروزرسانی شد';
            alertBody = `سلام ${updatedTicket.userId.name} عزیز!\n\nوضعیت تیکت "${updatedTicket.title}" به "${status}" تغییر کرد.`;
        }

        await Alert.create({
          title: alertTitle,
          body: alertBody,
          target: 'user',
          targetUsers: [updatedTicket.userId._id],
          source: 'manual',
          sourceId: id
        });
      }

      return updatedTicket;
    },

    addTicketResponse: async (_, { id, response }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const updatedTicket = await Ticket.findByIdAndUpdate(
        id,
        { response, status: 'پاسخ داده شده' },
        { new: true }
      ).populate({
        path: 'userId',
        select: '_id name phone status'
      });

      if (updatedTicket && updatedTicket.userId) {
        // خلاصه‌ای از پاسخ (۱۰۰ کاراکتر اول)
        const responsePreview = response.length > 100
          ? response.substring(0, 100) + '...'
          : response;

        await Alert.create({
          title: '💬 پاسخ تیکتت آماده‌ست!',
          body: `سلام ${updatedTicket.userId.name} عزیز!\n\nپاسخ تیکت "${updatedTicket.title}" آماده‌ست.\n\n📝 خلاصه پاسخ:\n"${responsePreview}"\n\nبرای مشاهده کامل پاسخ به پنل کاربری مراجعه کن.\n\n🙏 امیدواریم تونسته باشیم کمکت کنیم!`,
          target: 'user',
          targetUsers: [updatedTicket.userId._id],
          source: 'manual',
          sourceId: id
        });
      }

      return updatedTicket;
    },
  }
};

module.exports = ticketResolvers; 