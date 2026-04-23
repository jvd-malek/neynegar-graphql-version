const Comment = require('../../models/Comment');

const commentResolvers = {
  Query: {
    comments: async (_, { page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find()
          .skip(skip)
          .limit(limit),
        Comment.countDocuments()
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    comment: async (_, { id }) => {
      return await Comment.findById(id);
    },
    commentsByProduct: async (_, { productId, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({ productId })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({ productId })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    commentsByPackage: async (_, { packageId, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({ packageId })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({ packageId })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    commentsByArticle: async (_, { articleId, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({ articleId })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({ articleId })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    commentsById: async (_, { type, id, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;

      const [comments, total] = await Promise.all([
        Comment.find({ "target.type": type, "target.refId": id })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({ "target.type": type, "target.refId": id })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    commentsByUser: async (_, { page = 1, limit = 10 }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({ userId: user._id })
          .populate("userId")
          .populate("productId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({ userId: user._id })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    },
    commentsByStatus: async (_, { status, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({ status })
          .skip(skip)
          .limit(limit),
        Comment.countDocuments({ status })
      ]);

      return {
        comments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    }
  },

  Mutation: {
    createComment: async (_, { input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const comment = new Comment({
        ...input,
        userId: user._id,
        like: 0
      });
      return await comment.save();
    },

    updateComment: async (_, { id, input }) => {
      return await Comment.findByIdAndUpdate(id, input, { new: true });
    },

    deleteComment: async (_, { id }) => {
      const result = await Comment.findByIdAndDelete(id);
      return !!result;
    },

    addReply: async (_, { commentId, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const date = Date.now()
      const comment = await Comment.findById(commentId);
      comment.replies.push({
        ...input,
        userId: user._id,
        like: 0,
        createdAt: date
      });
      return await comment.save();
    },

    updateCommentStatus: async (_, { id, status }) => {
      return await Comment.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
    },

    likeComment: async (_, { id }) => {
      const comment = await Comment.findById(id);
      comment.like += 1;
      return await comment.save();
    },

    likeReply: async (_, { commentId, replyIndex }) => {
      const comment = await Comment.findById(commentId);
      if (comment.replies[replyIndex]) {
        comment.replies[replyIndex].like += 1;
      }
      return await comment.save();
    }
  }
};

module.exports = commentResolvers; 