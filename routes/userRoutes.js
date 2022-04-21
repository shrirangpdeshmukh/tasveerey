const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const Router = express.Router();

Router.get("/followers/:id", userController.getFollowers);
Router.get("/following/:id", userController.getFollowing);
Router.get("/:id", userController.getUserById);

Router.use(authController.protect);

Router.patch("/profile", userController.addBio);
Router.patch("/follow/:id", userController.followUser);

module.exports = Router;
