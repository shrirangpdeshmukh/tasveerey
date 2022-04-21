const config = require("../utils/config");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const Posts = require("../models/postModel");
const Hashtag = require("../models/hashtagModel");
const Comment = require("../models/commentModel");

const popOptions = [
  {
    path: "createdBy",
    select: "firstname lastname img",
  },
  // {
  //   path: "votes",
  //   select: "createdBy",
  // },
  {
    path: "comments",
    populate: {
      path: "createdBy",
      select: "firstname lastname img",
    },
  },
];

/**
 *
 * @param {string} content
 * @returns Array of unique hashtag names in the given content
 */
const extractTagsFromPost = (content) => {
  const caption = content.toLowerCase().split(" ");
  const tagList = caption.filter((word) => word[0] === "#");

  let tags = [];

  for (let ele of tagList) {
    const t = ele.split("#").filter((word) => word.length > 0);
    tags = tags.concat(t);
  }

  tags = [...new Set(tags)];
  console.log({ finalTags: tags });
  return tags;
};

//controller for GET requests on /posts/all endpoint
exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Posts.find({ isBlacklisted: { $ne: true } })
    .populate(popOptions)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: posts.length,
    posts,
  });
});

//controller for GET requests on /posts endpoint
exports.getMyPosts = catchAsync(async (req, res, next) => {
  const user = req.user?._id;

  const myPosts = await Posts.find({ createdBy: user })
    .populate(popOptions)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: myPosts.length,
    posts: myPosts,
  });
});

//controller for GET requests on /posts/user/:id endpoint
exports.getUserPosts = catchAsync(async (req, res, next) => {
  const user = req.params?.id;

  const posts = await Posts.find({ createdBy: user })
    .populate(popOptions)
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: posts.length,
    posts,
  });
});

//controller for POST requests on /posts endpoint
exports.createPost = catchAsync(async (req, res, next) => {
  const user = req.user?._id;
  const data = req.body;

  let post = new Posts();
  const files = [];

  if (req.files) {
    req.files.forEach((file) => {
      files.push(file.filename);
    });
  }

  const tags = extractTagsFromPost(data.caption);

  await Promise.all(
    tags.map(async (tag) => {
      const tagDocument = await Hashtag.findOne({ name: tag });

      if (tagDocument) {
        console.log("documment already exists");
        tagDocument.associatedPosts.push(post._id);
        await tagDocument.save();
      } else {
        console.log("document doesnot exist createc new one");
        await Hashtag.create({ name: tag, associatedPosts: [post._id] });
      }
    })
  );

  post.caption = data.caption;
  post.tags = tags;
  post.image = files;
  post.createdBy = user;

  await post.save();

  res.status(201).json({
    status: "success",
    post,
  });
});

//controller for GET requests on /posts/:postId endpoint
exports.getPost = catchAsync(async (req, res, next) => {
  const postId = req.params?.postId;

  const post = await Posts.findById(postId).populate(popOptions);

  if (!post) {
    return next(new AppError(`No post found with id ${postId}`, 404));
  }

  res.status(200).json({
    status: "success",
    post,
  });
});

//controller for PATCH requests on /posts/:postId endpoint
exports.updatePost = catchAsync(async (req, res, next) => {
  const postId = req.params?.postId;
  const user = req.user?._id;

  if (req.body.image) {
    return next(new AppError("files can't be updated", 403));
  }

  const modifiedPost = await Posts.findOneAndUpdate(
    {
      _id: postId,
      createdBy: user,
    },
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!modifiedPost) {
    return next(new AppError(`No post found with id ${postId}`, 404));
  }

  res.status(200).json({
    status: "success",
    modifiedPost,
  });
});

//controller for DELETE requests on /posts/:postId endpoint
exports.deletePost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  const post = await Posts.findByIdAndDelete(postId);
  if (!post) {
    return next(new AppError(`No post found with id ${postId}`, 404));
  }

  const comments = await Comment.remove({ parentId: postId });

  res.json({
    status: "success",
    post: null,
  });
});

// controller for GET requests on /posts/tags endpoint.
exports.getPostsByTag = catchAsync(async (req, res, next) => {
  const searchQuery = req.query.search;

  const query = searchQuery.toLowerCase();

  const hashtag = await Hashtag.findOne({ name: query }).populate({
    path: "associatedPosts",
    populate: popOptions,
  });

  const posts = hashtag.associatedPosts;

  res.status(200).json({
    status: "success",
    results: posts.length,
    posts,
  });
});

// controller for PATCH requests on /posts/blacklist/:id endpoint.
exports.blacklistPost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  await Posts.findByIdAndUpdate(postId, {
    isBlacklisted: true,
  });

  res.status(200).json({
    status: "success",
    message: "Post blacklisted successfully",
  });
});

// controller for PATCH requests on /posts/whitelist/:id endpoint.
exports.whitelistPost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  await Posts.findByIdAndUpdate(postId, {
    isBlacklisted: false,
  });

  res.status(200).json({
    status: "success",
    message: "Post whitelisted successfully",
  });
});
