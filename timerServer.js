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

const upload = multer({ storage: multer.memoryStorage() });

// Setting up CORS
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from localhost:3000
  })
);
app.use(express.json());

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

app.post("/api/upload", upload.single("imageFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { ipfs } = req.body;
    const ipfsImageResponse = await axios.get(ipfs, {
      responseType: "arraybuffer",
    });

    const liveImage = req.file.buffer;
    const ipfsImage = Buffer.from(ipfsImageResponse.data, "binary");

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

// Listening to the port
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
