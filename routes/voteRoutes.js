const express = require("express");
const authController = require("../controllers/authController");
const voteController = require("../controllers/voteController");

const Router = express.Router();

Router.patch("/:id", authController.protect, voteController.vote);

module.exports = Router;
