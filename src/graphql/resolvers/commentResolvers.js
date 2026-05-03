const Comment = require('../../models/Comment');
const Product = require('../../models/Product');
const Article = require('../../models/Article');
const Course = require('../../models/Course');
const Package = require('../../models/Package');

const commentResolvers = {
  Query: {

    comments: async (_, { page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find()
          .populate("userId")
          .populate("replies.userId")
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
      return await Comment.findById(id)
        .populate("userId")
        .populate("replies.userId");
    },

    commentsByProduct: async (_, { productId, page = 1, limit = 10 }) => {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        Comment.find({
          "target.type": "Product",
          "target.refId": productId
        })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({
          "target.type": "Product",
          "target.refId": productId
        })
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
        Comment.find({
          "target.type": "Package",
          "target.refId": packageId
        })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({
          "target.type": "Package",
          "target.refId": packageId
        })
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
        Comment.find({
          "target.type": "Article",
          "target.refId": articleId
        })
          .populate("userId")
          .populate("replies.userId")
          .skip(skip)
          .limit(limit)
          .exec(),
        Comment.countDocuments({
          "target.type": "Article",
          "target.refId": articleId
        })
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
          .sort({ createdAt: -1 })
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
          .populate("replies.userId")
          .sort({ createdAt: -1 })
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
          .populate("userId")
          .populate("replies.userId")
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

      // اعتبارسنجی target
      if (!input.target || !input.target.type || !input.target.id) {
        throw new Error("Target type and id are required");
      }

      const comment = new Comment({
        txt: input.txt,
        star: input.star,
        target: {
          type: input.target.type,
          refId: input.target.id
        },
        userId: user._id,
        like: 0,
        status: "در انتظار تایید"
      });

      return await comment.save();
    },

    updateComment: async (_, { id, input }) => {
      const updateData = { ...input };

      // اگر target در input وجود داشت، ساختارش رو درست کن
      if (input.target) {
        updateData.target = {
          type: input.target.type,
          refId: input.target.id
        };
      }

      return await Comment.findByIdAndUpdate(id, updateData, { new: true })
        .populate("userId")
        .populate("replies.userId");
    },

    deleteComment: async (_, { id }) => {
      const result = await Comment.findByIdAndDelete(id);
      return !!result;
    },

    addReply: async (_, { commentId, input }, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");

      comment.replies.push({
        txt: input.txt,
        userId: user._id,
        like: 0,
        createdAt: new Date()
      });

      return await comment.save();
    },

    updateCommentStatus: async (_, { id, status }) => {
      return await Comment.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate("userId")
        .populate("replies.userId");
    },

    likeComment: async (_, { id }) => {
      const comment = await Comment.findById(id);
      if (!comment) throw new Error("Comment not found");

      comment.like += 1;
      return await comment.save();
    },

    likeReply: async (_, { commentId, replyIndex }) => {
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");

      if (comment.replies[replyIndex]) {
        comment.replies[replyIndex].like += 1;
      } else {
        throw new Error("Reply not found");
      }

      return await comment.save();
    }
  },

  Comment: {
    target: async (parent) => {
      if (!parent.target || !parent.target.refId) return parent.target;

      let populatedTarget = null;
      try {
        switch (parent.target.type) {
          case 'Product':
            populatedTarget = await Product.findById(parent.target.refId);
            break;
          case 'Article':
            populatedTarget = await Article.findById(parent.target.refId);
            break;
          case 'Course':
            populatedTarget = await Course.findById(parent.target.refId);
            break;
          case 'Package':
            populatedTarget = await Package.findById(parent.target.refId);
            break;
        }
      } catch (error) {
        console.error('Error populating target:', error);
      }
      console.log(populatedTarget);

      return {
        ...parent.target,
        data: populatedTarget
      };
    }
  }
};

module.exports = commentResolvers; 