// to run the file use nodemon .\timerServer.js or node .\timerServer.js

const express = require("express");
const cors = require("cors");

// Initializing the app
const app = express();
var dotenv = require("dotenv");
const mongoDB = require("./config/db");
const User = require("./models/userModel");
const colors = require("colors");
const fs = require("fs").promises;
const compareImages = require("resemblejs/compareImages");
const axios = require("axios");
const multer = require("multer");
const nodeWebCam = require("node-webcam");
const path = require("path");
const { Camera, capture, VideoCapture } = require("camera-capture");
const { exec } = require("child_process");
const bodyParser = require("body-parser");

const upload = multer({ storage: multer.memoryStorage() });

// Setting up CORS
app.use(cors());
// app.use(
//   cors({
//     origin: ["http://localhost:3000", "http://localhost:5500"], // Allow requests from localhost:3000
//   })
// );
app.use(express.json());
app.use(express.static("images"));
// app.use(express.static("public")); // Serving static files from 'public' folder
app.use(bodyParser.json());

dotenv.config();
mongoDB();

const PORT = 3001; // Choose a port number

// Timer state variable
let isTimerRunning = false;

// Timer object
let timer = null;
let timerStartTime = null;

let countdown = 0;

// Starting the timer
app.post("/start-timer", (req, res) => {
  const { time } = req.body;

  if (isTimerRunning) {
    return res.status(400).send({ message: "Timer already running" });
  }

  console.log(typeof time);

  // Validate time input
  if (typeof time !== "number" || time <= 0) {
    return res.status(400).send({ message: "Invalid time value" });
  }

  countdown = time;

  isTimerRunning = true;
  timerStartTime = Date.now();
  timer = setInterval(() => {
    const remainingTime = time - (Date.now() - timerStartTime);

    if (remainingTime <= 0) {
      isTimerRunning = false;
      clearInterval(timer);
      timer = null;

      // Trigger notification or perform desired action
      console.log("Timer has ended!");
    }
  }, 100); // Check every 100 milliseconds

  res.send({ message: "Timer started" });
});

// Getting the remaining time
app.get("/remaining-time", (req, res) => {
  if (!isTimerRunning) {
    res.send({ message: "Timer not running" });
    return;
  }

  const remainingTime = countdown - (Date.now() - timerStartTime);
  res.send({ remainingTime });
});

// Stopping the timer
app.post("/stop-timer", (req, res) => {
  if (!isTimerRunning) {
    return res.send({ message: "Timer already stopped" });
  }

  isTimerRunning = false;
  clearInterval(timer);
  timer = null;

  res.send({ message: "Timer stopped" });
});

app.post("/add-pin", async (req, res) => {
  if (req.body.address && req.body.pin) {
    const user = new User(req.body);
    let result = await user.save();
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(404).send("Something went wrong");
    }
  }
});

app.get("/get-pin/:id/:pin", async (req, res) => {
  const query = { address: { $regex: new RegExp(req.params.id, "i") } };
  let result = await User.findOne(query);
  if (result.pin == req.params.pin) {
    res.status(200).json(result);
  } else {
    res.status(404).send("not authenticated");
  }
});

// app.post("/api/image-similarity", async (req, res) => {
//   try {
//     const { imageUrl1, imageUrl2 } = req.body;

//     if (!imageUrl1 || !imageUrl2) {
//       return res
//         .status(400)
//         .json({ error: "Please provide both imageUrl1 and imageUrl2" });
//     }

//     const image1Response = await axios.get(imageUrl1, {
//       responseType: "arraybuffer",
//     });
//     const image2Response = await axios.get(imageUrl2, {
//       responseType: "arraybuffer",
//     });

//     const image1Buffer = Buffer.from(image1Response.data, "binary");
//     const image2Buffer = Buffer.from(image2Response.data, "binary");
//     // console.log(image1Buffer);
//     const options = {
//       output: {
//         errorColor: {
//           red: 255,
//           green: 0,
//           blue: 255,
//         },
//         errorType: "movement",
//         transparency: 0.3,
//         largeImageThreshold: 1200,
//         useCrossOrigin: false,
//         outputDiff: true,
//       },
//       scaleToSameSize: true,
//       ignore: "antialiasing",
//     };
//     console.log(image1Buffer);
//     console.log("*****************************************");
//     console.log(image2Buffer);
//     const data = await compareImages(image1Buffer, image2Buffer, options);
//     // const data = await compareImages(
//     //   await fs.readFile("image1.jpg"),
//     //   await fs.readFile("image2.jpg"),
//     //   options
//     // );

//     if (data && data.misMatchPercentage > 30) {
//       res.status(403).json({ result: "not matching" });
//     } else {
//       res.status(200).json({ result: "matched" });
//     }

//     // console.log(data.misMatchPercentage);
//     // res.json(data);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

const captureLiveImage = async () => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        video.play();

        video.addEventListener("click", () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          const dataURL = canvas.toDataURL("image/jpeg");
          const liveImage = Buffer.from(dataURL.split(",")[1], "base64");

          resolve(liveImage);
        });
      })
      .catch((error) => {
        console.log("error here")
        reject(error);
      });
  });
};

app.post("/api/compare-images", async (req, res) => {
  try {
    const ipfsImgLink = req.body.ipfsLink;
    const liveImgData = req.body.imageData;
    
    const ipfsImageResponse = await axios.get(ipfsImgLink, {
      responseType: "arraybuffer",
    });
    const ipfsImage = Buffer.from(ipfsImageResponse.data, "binary");
    
    const liveImage = Buffer.from(liveImgData, "base64");

    const options = {
      output: {
        errorColor: {
          red: 255,
          green: 0,
          blue: 255,
        },
        errorType: "movement",
        transparency: 0.3,
        largeImageThreshold: 1200,
        useCrossOrigin: false,
        outputDiff: true,
      },
      scaleToSameSize: true,
      ignore: "antialiasing",
    };

    const data = await compareImages(liveImage, ipfsImage, options);
    if (data && data.misMatchPercentage > 30) {
      res.status(403).json({ result: "not matching" });
    } else {
      res.status(200).json({ result: "matched" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

var options = {
  width: 1280,
  height: 720,
  quality: 100,
  delay: 1,
  saveShots: true,
  output: "jpeg",
  device: false,
  callbackReturn: "location",
};
var webcam = nodeWebCam.create(options);
const videoCapture = new VideoCapture();
// const camera = new Camera();

// app.get("/api/capture-image", async (req, res) => {
//   try {
//     // Execute fswebcam command to capture an image
//     exec(
//       "fswebcam -r 1280x720 --no-banner /tmp/captured_image.jpg",
//       async (error, stdout, stderr) => {
//         if (error) {
//           console.error("Error:", error);
//           res.status(500).json({ error: "Error capturing image" });
//           return;
//         }

//         // Read the captured image
//         const imageData = await fs.readFile("/tmp/captured_image.jpg");

//         // Serve the captured image as a response
//         res.set("Content-Type", "image/jpeg");
//         res.send(imageData);
//       }
//     );
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Error capturing image" });
//   }
// });

app.post("/save-photo", (req, res) => {
  const { photoData } = req.body;
  // Handle the received photoData (e.g., save it to a file, process it, etc.)
  // Example base64-encoded image string
  const base64Image = photoData; // Replace with your actual base64 image data

  // Remove the header (e.g., 'data:image/jpeg;base64,') from the base64 string
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  // Convert the base64 string to a buffer
  const imageBuffer = Buffer.from(base64Data, "base64");

  console.log("Converted image to buffer:", imageBuffer);

  // console.log("Received photo data:", photoData);
  res.json({ result: imageBuffer });
});

// app.get("/api/capture-image", (req, res) => {
//   try {
//     Webcam.capture("test_picture", (err, data) => {
//       if (err) {
//         console.error(err);
//         res.status(500).json({ error: "Error capturing image" });
//         return;
//       }

//       console.log("Image captured:", data);
//       res.json({ message: "Image captured successfully", imagePath: data });
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Unexpected error occurred" });
//   }
// });

app.use(express.static("public")); // Assuming `index.html` is in a "public" folder

// Catch-all route to serve `index.html` for any other request
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Listening to the port
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
