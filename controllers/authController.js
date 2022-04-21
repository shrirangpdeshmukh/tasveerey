const { OAuth2Client } = require("google-auth-library");
const { promisify } = require("util");
const config = require("../utils/config");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const client = new OAuth2Client(config.CLIENT_ID);

/**
 *
 * @param {string} id
 * @param {string} role
 * @returns JWT with payload as id and role of the user signed with config secret.
 */
const createToken = (id, role) => {
  const jwtToken = jwt.sign({ id, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
  return jwtToken;
};

// middleware for restricting access to particular roles.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// middleware for ensuring that the user is logged in and the user is present in the system.
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  // 2) Verifying token
  const decoded = await promisify(jwt.verify)(token, config.JWT_SECRET);

  // 3) Finding user based on decoded id
  const userID = decoded.id;

  const currentUser = await User.findById(userID);
  if (!currentUser) {
    return next(new AppError("User not found", 401));
  }
  req.user = currentUser;
  next();
});

// controller for POST requests on /auth/login endpoint.
exports.login = catchAsync(async (req, res, next) => {
  // 1) Get Google OAuth token from front-end
  const { token } = req.body;

  if (!token) return next(new AppError("User not logged in.", 403));

  // 2) Verify it to get details from Google
  const data = await client.verifyIdToken({
    idToken: token,
    audience: config.CLIENT_ID,
  });

  const { given_name, family_name, email, picture } = data.payload;

  // 3) Check if a user with the same email already exists, if not, create a new one
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      firstname: given_name,
      lastname: family_name,
      img: picture,
    });
  }

  // 4) Send JWT as cookie to the client.
  const jwtToken = createToken(user._id, user.role);
  const expireAt = new Date(
    Date.now() + config.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  );
  const cookieOptions = {
    expires: expireAt,
    httpOnly: true,
    secure: config.NODE_ENV === "production",
  };

  res.cookie("jwt", jwtToken, cookieOptions);
  res.send(user);
});

// controller for POST requests /auth/logout endpoint.
exports.logout = catchAsync(async (req, res, next) => {
  // Clear the JWT cookie to remove authentication.
  res.clearCookie("jwt", {
    path: "/",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});
