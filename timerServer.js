// to run the file use nodemon .\timerServer.js or node .\timerServer.js

const express = require("express");
const cors = require("cors");

// Initializing the app
const app = express();
var dotenv = require("dotenv");
const mongoDB = require("./config/db");
const User = require("./models/userModel");
const colors = require("colors");

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
// Listening to the port
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
