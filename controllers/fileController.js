const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const sharp = require("sharp");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const { Readable } = require("stream");

const config = require("../utils/config");
const catchAsync = require("../utils/catchAsync");

// Init gfs
let gfs;

mongoose.connection
  .once("open", () => {
    // Init stream
    console.log("Grid FS Connected");
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection("uploads");
  })
  .on("error", function (error) {
    console.log("Error is: ", error);
  });

// Create storage engine
const storage = new GridFsStorage({
  url: config.MONGODB_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

// middleware to accept images to the DB
exports.multerUpload = multer().any();

// middleware to resize and uploads images to the DB.
exports.resizeAndUploadFiles = catchAsync(async (req, res, next) => {
  await Promise.all(
    req.files.map(async (file, i) => {
      const metadata = await sharp(file.buffer).metadata();
      const { width, height } = metadata;

      const data = await sharp(file.buffer)
        .resize(
          width > height
            ? { fit: sharp.fit.contain, width: 800 }
            : { fit: sharp.fit.contain, height: 800 }
        )
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer();
      // data here directly contains the buffer object.
      const fileStream = Readable.from(data);

      // write the resized stream to the database.
      const dest = await storage.fromStream(fileStream, req, file);
      console.log("saved file");

      req.files[i].filename = dest.filename;
    })
  );

  console.log("next...");

  next();
});

// controller for GET requests on /files/:filename endpoint.
exports.getFile = (req, res) => {
  const { filename } = req.params;

  gfs.files.findOne({ filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    console.log("file found");
    // Read output to browser
    res.setHeader("Content-Type", file.contentType);
    const readstream = gfs.createReadStream(file.filename);

    readstream.pipe(res);
  });
};
