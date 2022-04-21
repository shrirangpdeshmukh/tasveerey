const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    caption: {
      type: String,
      required: true,
    },
    image: {
      type: [String],
      minlength: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    tags: {
      type: [String],
    },
    votes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentId",
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
