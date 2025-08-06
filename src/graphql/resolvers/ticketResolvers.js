const Ticket = require('../../models/Ticket');

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

    ticketsByUser: async (_, { userId, page = 1, limit = 10 }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const skip = (page - 1) * limit;
        const [tickets, total] = await Promise.all([
          Ticket.find({ userId })
            .populate({
              path: 'userId',
              select: '_id name phone status'
            })
            .skip(skip)
            .limit(limit)
            .sort({ _id: -1 }),
          Ticket.countDocuments({ userId })
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
      return await ticket.save();
    },

    updateTicket: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Ticket.findByIdAndUpdate(id, input, { new: true })
        .populate({
          path: 'userId',
          select: '_id name phone status'
        });
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
      return await Ticket.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate({
        path: 'userId',
        select: '_id name phone status'
      });
    },

    addTicketResponse: async (_, { id, response }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");
      return await Ticket.findByIdAndUpdate(
        id,
        { response, status: 'پاسخ داده شده' },
        { new: true }
      ).populate({
        path: 'userId',
        select: '_id name phone status'
      });
    }
  }
};

module.exports = ticketResolvers; 