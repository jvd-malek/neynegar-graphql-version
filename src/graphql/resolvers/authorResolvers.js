const Author = require('../../models/Author');

const authorResolvers = {
  Query: {
    authors: async () => {
      return await Author.find();
    },
    author: async (_, { id }) => {
      return await Author.findById(id);
    },
    authorByName: async (_, { firstname, lastname }) => {
      return await Author.findOne({ firstname, lastname });
    }
  },

  Mutation: {
    createAuthor: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")
      const author = new Author(input);
      return await author.save();
    },

    updateAuthor: async (_, { id, input }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")
      return await Author.findByIdAndUpdate(id, input, { new: true });
    },

    deleteAuthor: async (_, { id }, { user }) => {
      if (!user) throw new Error("Unauthorized")
      if (user.status !== "admin" && user.status !== "owner") throw new Error("Unauthorized")
      const result = await Author.findByIdAndDelete(id);
      return !!result;
    }
  }
};

module.exports = authorResolvers; 