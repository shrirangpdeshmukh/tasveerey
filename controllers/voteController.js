const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.vote = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const postId = req.params.id;
  const post = await Post.findById(postId);

  if (!post) {
    return next(new AppError("Associated Post not found", 404));
  }

  const index = post.votes.indexOf(user);

  // vote already exists -> remove it
  // vote doesn't exist -> add it
  if (index > -1) {
    post.votes.splice(index, 1);
  } else {
    post.votes.push(user);
  }

  await post.save();

  res.status(200).json({
    status: "success",
    message: "Post updated successfully",
  });
});
