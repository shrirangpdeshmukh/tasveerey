const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// controller for GET requests on /users/:id endpoint.
exports.getUserById = catchAsync(async (req, res, next) => {
  const id = req.params.id;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 400));
  }

  res.status(200).json({
    status: "success",
    user,
  });
});

// controller for PATCH requests on /users/profile endpoint.
exports.addBio = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const { bio } = req.body;

  const updatedUser = await User.findByIdAndUpdate(user, { bio });

  res.status(200).json({
    status: "success",
    message: "Bio updated successfully",
    bio,
  });
});

// controller for PATCH requests on /users/follow/:id
exports.followUser = catchAsync(async (req, res, next) => {
  const user1 = req.user;
  const user2 = await User.findById(req.params.id);

  if (!user2) {
    return next(new AppError("Other user not found", 404));
  }
  console.log({
    user1Following: user1.following,
    user2Followers: user2.followers,
  });

  const index1 = user1.following.indexOf(user2._id);
  const index2 = user2.followers.indexOf(user1._id);

  let message, response;

  if (index1 === -1 && index2 === -1) {
    // user1 does not follow user2
    user1.following.push(user2._id);
    user2.followers.push(user1._id);
    message = `${user1._id} started following ${user2._id}`;
    response: 1;
  } else if (index1 !== -1 && index2 !== -1) {
    // user1 is already following user2, so we need to remove them from the list
    user1.following.splice(index1, 1);
    user2.followers.splice(index2, 1);
    message = `${user1._id} unfollowed ${user2._id}`;
    response: -1;
  } else {
    return next(
      new AppError(
        "Inconsistency found in index1 and index2, try again later",
        400
      )
    );
  }

  await Promise.all([await user1.save(), await user2.save()]);

  res.status(200).json({
    status: "success",
    message,
    response,
  });
});

// controller for GET requests on /users/followers/:id endpoint.
exports.getFollowers = catchAsync(async (req, res, next) => {
  const userID = req.params.id;

  const user = await User.findById(userID).populate({
    path: "followers",
    select: "firstname lastname img",
  });

  res.status(200).json({
    status: "success",
    followers: user.followers,
  });
});

// controller for GET requests on /users/following/:id endpoint.
exports.getFollowing = catchAsync(async (req, res, next) => {
  const userID = req.params.id;

  const user = await User.findById(userID).populate({
    path: "following",
    select: "firstname lastname img",
  });

  res.status(200).json({
    status: "success",
    following: user.following,
  });
});
