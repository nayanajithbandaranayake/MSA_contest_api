const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();
const functions = require("firebase-functions");

// const app = express()
// app.use(cors({
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
// }))
// app.use(express.json())

// const server = http.createServer(app)

// const io  = new Server(server, {
//     cors: {
//         origin: "http://localhost:3000",
//         methods: ["GET", "POST"]
//     },
// })

const authorizePassword = (password) => process.env.ADMIN_PASSWORD === password;

const files = require("fs").promises;
const PORT = process.env.PORT || 8000;

const io = require("socket.io")(PORT, {
  cors: [process.env.FRONTEND_URL],
});

io.on("connection", (socket) => {
  socket.emit("user_connect", { id: socket.id });
  console.log(socket.id);
  socket.on("submit_result", async (data) => {
    console.log("results submitting");
    console.log(data);
    try {
      const dataInFile = JSON.parse(await files.readFile("data.json"));

      const alreadyPresentIndex = dataInFile.findIndex(
        (x) =>
          x.school_id === data.school_id && x.subject_id === data.subject_id
      );
      console.log(alreadyPresentIndex);
      if (alreadyPresentIndex !== -1) return;

      dataInFile.push(data);
      console.log(dataInFile);

      socket.broadcast.emit("results_submitted", data);
      await files.writeFile("data.json", JSON.stringify(dataInFile));
    } catch (error) {
      console.log(error);
      socket.emit("error", {
        error: "internal server error.",
      });
    }
  });

  socket.on("get_results", async () => {
    try {
      const data = JSON.parse(await files.readFile("data.json"));
      socket.emit("results_dispatched", data);
    } catch (error) {
      console.log(error);
      socket.emit("error", {
        error: "internal server error.",
      });
    }
  });
  socket.on("reset_marks", async ({ password }) => {
    try {
      if (!authorizePassword(password)) {
        console.log("Password authorization failed");
        return;
      }

      await files.writeFile("data.json", JSON.stringify([]));
      socket.broadcast.emit("results_dispatched", []);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("fetch_questions", async (id) => {
    const questionsInFile = JSON.parse(await files.readFile("questions.json"));
    socket.emit(
      "questions_dispatched",
      questionsInFile[id] ? questionsInFile[id] : []
    );
  });
  socket.on("update_questions", async ({ password, new_questions, id }) => {
    if (!authorizePassword(password)) {
      console.log("Password authorization failed");
      return;
    }

    const qInFile = JSON.parse(await files.readFile("questions.json"));
    qInFile[id] = new_questions;
    await files.writeFile("questions.json", JSON.stringify(qInFile));
    socket.broadcast.emit("questions_changed");
  });
});

// app.post("/", async (req, res) => {
//     const { school_id, subject_id, marks } = req.body

//     try {
//         const dataInFile = JSON.parse(await files.readFile("data.json"))

//         const alreadyPresentIndex = dataInFile.findIndex((x) => x.school_id === school_id && x.subject_id === subject_id)
//         console.log(alreadyPresentIndex);
//         if(alreadyPresentIndex !== -1)
//         return res.status(400).end()

//         dataInFile.push({ school_id, subject_id, marks })
//         console.log(dataInFile);

//         await files.writeFile("data.json", JSON.stringify(dataInFile))

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             error: "internal server error."
//         })
//     }
//     return res.status(201).end()
// })

// app.get("/", async(req, res) => {
//     try {
//         const data = JSON.parse(await files.readFile("data.json"))
//         return res.status(200).json(data)
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             error: "internal server error"
//         })
//     }
// })

// server.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}...`);
// })
exports.api = functions.https.onRequest(io);
