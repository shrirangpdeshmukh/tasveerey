const Comment = require("../models/commentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// controller for POST requests on /comment/:id endpoint.
exports.postComment = catchAsync(async (req, res, next) => {
  const user = req.user?._id;
  const { comment } = req.body;
  const parentId = req.params?.id;

  if (!comment) {
    return next(new AppError("Comment not found", 400));
  }

  const newComment = await Comment.create({
    createdBy: user,
    parentId,
    body: comment,
  });

  res.status(201).json({
    status: "success",
    message: "Comment created successfully",
    comment: newComment,
  });
});

// controller for DELETE requests on /comment/:id endpoint.
exports.deleteComment = catchAsync(async (req, res, next) => {
  const user = req.user?._id;
  const { id } = req.params;

  const comment = await Comment.findById(id).populate({
    path: "parentId",
    select: "createdBy",
    model: "Post",
  });

  if (!comment) {
    return next(new AppError("Comment not found", 404));
  }

  console.log({ user });
  console.log({ comment });

  if (
    !(
      user.equals(comment.createdBy) || user.equals(comment.parentId?.createdBy)
    )
  ) {
    return next(
      new AppError("You are not allowed to delete this comment", 403)
    );
  }

  await comment.delete();

  res.status(204).json({
    status: "success",
    message: "Comment deleted successfully",
  });
});
