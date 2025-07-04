const Code = require('../../models/Code');
const moment = require('jalali-moment');

const codeResolvers = {
  Query: {
    codes: async () => {
      return await Code.find();
    },
    code: async (_, { id }) => {
      return await Code.findById(id);
    },
    codeByPhone: async (_, { phone }) => {
      return await Code.findOne({ phone });
    }
  },

  Mutation: {
    createCode: async (_, { input }) => {
      const code = new Code(input);
      return await code.save();
    },

    updateCode: async (_, { id, input }) => {
      return await Code.findByIdAndUpdate(id, input, { new: true });
    },

    deleteCode: async (_, { id }) => {
      const result = await Code.findByIdAndDelete(id);
      return !!result;
    },

    verifyCode: async (_, { phone, code }) => {
      const codeDoc = await Code.findOne({ phone, code });
      if (!codeDoc) {
        return false;
      }

      const now = moment().unix();
      if (now > codeDoc.exTime) {
        return false;
      }

      if (codeDoc.count <= 0) {
        return false;
      }

      codeDoc.count -= 1;
      await codeDoc.save();

      return true;
    }
  }
};

module.exports = codeResolvers; 