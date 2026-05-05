const Alert = require('../../models/Alert');
const User = require('../../models/User');

const alertResolvers = {
  Query: {
    alerts: async (_, { page = 1, limit = 20, source }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const skip = (page - 1) * limit;
      const query = {};
      if (source) query.source = source;

      const [alerts, total] = await Promise.all([
        Alert.find(query)
          .populate('targetUsers')
          .populate('readBy.userId')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Alert.countDocuments(query)
      ]);

      return {
        alerts,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },

    alert: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      return await Alert.findById(id)
        .populate('targetUsers')
        .populate('readBy.userId');
    },

    userAlerts: async (_, { page = 1, limit = 20 }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const skip = (page - 1) * limit;

      // پیدا کردن آلرت‌هایی که برای این کاربر نمایش داده بشن
      const query = {
        $or: [
          { target: 'all' },
          { target: 'user', targetUsers: user._id },
          { target: 'status', targetStatus: user.status }
        ]
      };

      const [alerts, total] = await Promise.all([
        Alert.find(query)
          .populate('targetUsers')
          .populate('readBy.userId')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Alert.countDocuments(query)
      ]);

      return {
        alerts,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },

    unreadAlertCount: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const query = {
        $or: [
          { target: 'all' },
          { target: 'user', targetUsers: user._id },
          { target: 'status', targetStatus: user.status }
        ],
        'readBy.userId': { $ne: user._id }
      };

      return await Alert.countDocuments(query);
    }
  },

  Mutation: {
    createAlert: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const alert = new Alert(input);
      return await alert.save();
    },

    deleteAlert: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized");

      const result = await Alert.findByIdAndDelete(id);
      return !!result;
    },

    markAlertAsRead: async (_, { alertId }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const alert = await Alert.findById(alertId);
      if (!alert) throw new Error("Alert not found");

      // بررسی کن قبلاً نخونده باشه
      const alreadyRead = alert.readBy.some(r => r.userId.toString() === user._id.toString());
      if (!alreadyRead) {
        alert.readBy.push({ userId: user._id, readAt: new Date() });
        await alert.save();
      }

      return alert;
    },

    markAllAlertsAsRead: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // همه آلرت‌های این کاربر که نخونده
      const alerts = await Alert.find({
        $or: [
          { target: 'all' },
          { target: 'user', targetUsers: user._id },
          { target: 'status', targetStatus: user.status }
        ],
        'readBy.userId': { $ne: user._id }
      });

      for (const alert of alerts) {
        alert.readBy.push({ userId: user._id, readAt: new Date() });
        await alert.save();
      }

      return true;
    }
  }
};

module.exports = alertResolvers;