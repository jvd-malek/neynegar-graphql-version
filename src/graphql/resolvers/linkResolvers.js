const Link = require('../../models/Link');

const linkResolvers = {
  Query: {
    links: async () => {
      return await Link.find();
    },
    link: async (_, { id }) => {
      return await Link.findById(id);
    },
    linkByPath: async (_, { path }) => {
      return await Link.findOne({ path });
    }
  },

  Mutation: {
    createLink: async (_, { input }) => {
      const link = new Link(input);
      return await link.save();
    },

    updateLink: async (_, { id, input }) => {
      return await Link.findByIdAndUpdate(id, input, { new: true });
    },

    deleteLink: async (_, { id }) => {
      const result = await Link.findByIdAndDelete(id);
      return !!result;
    },

    updateLinkSort: async (_, { id, sort }) => {
      return await Link.findByIdAndUpdate(
        id,
        { sort },
        { new: true }
      );
    }
  }
};

module.exports = linkResolvers; 