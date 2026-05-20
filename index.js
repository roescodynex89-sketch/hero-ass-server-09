const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// app.use(cors());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

// .env
const uri = process.env.MONGO_DB_URI;
const jwtSecret = process.env.JWT_SECRET;

// Db client

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


//  middleware add


const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized Access",
    });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).send({
        success: false,
        message: "Invalid Token",
      });
    }

    req.user = decoded;
    next();
  });
};













async function run() {
  try {
    await client.connect();

    const db = client.db("hero-server");
    const ideasCollection = db.collection("ideas");
    const commentsCollection = db.collection("comments");
    console.log("Successfully connected to MongoDB Workspace!");

    // =========================================================================
    // 🔑 JWT TOKEN GENERATION ROUTE
    // =========================================================================
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, jwtSecret, {
        expiresIn: "7d",
      });

      // res.cookie("token", token, {
      //   httpOnly: true,
      //   secure: true,
      //   sameSite: "strict",
      //   maxAge: 7 * 24 * 60 * 60 * 1000,
      // });



res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});




      res.send({ token });
    });



// logout add


app.post("/logout", async (req, res) => {
  try {
    res
      .clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      })
      .send({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).send({ success: false, message: "Server error during logout" });
  }
});


















    // =========================================================================
    // 💡 IDEAS API ROUTES
    // =========================================================================

    // ১. ADD NEW IDEA (🔒 PROTECTED + SECURITY FIX)
    app.post("/ideas", verifyToken, async (req, res) => {
      try {
        const idea = req.body;

        // ✅ ADD IDEA SECURITY FIX
        if (req.user.email !== idea.userEmail) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await ideasCollection.insertOne(idea);
        if (result.insertedId) {
          return res.status(201).send(result);
        } else {
          return res.status(400).send({ success: false, message: "failed" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to insert idea" });
      }
    });

    // ২. GET SEARCH & FILTER & TRENDING LIMIT (🌍 PUBLIC)
    app.get("/ideas", async (req, res) => {
      try {
        const { search, category, limit } = req.query;
        let query = {};
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }
        if (category && category !== "All") {
          query.category = category;
        }
        let cursor = ideasCollection.find(query).sort({ createdAt: -1 });

        if (limit) {
          cursor = cursor.limit(parseInt(limit));
        }
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch ideas" });
      }
    });

    // ৩. SINGLE IDEA DETAILS (🌍 PUBLIC)
    app.get("/ideas/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await ideasCollection.findOne(query);
        if (!result) {
          return res
            .status(404)
            .send({ success: false, message: "Idea not found" });
        }
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Server error fetching details" });
      }
    });

    // =========================================================================
    // 💬 COMMENTS API ROUTES
    // =========================================================================

    // ১. ADD COMMENT (🔒 PROTECTED + SECURITY FIX)
    app.post("/comments", verifyToken, async (req, res) => {
      try {
        const comment = req.body;

        // ✅ ADD COMMENT SECURITY FIX
        if (req.user.email !== comment.userEmail) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await commentsCollection.insertOne(comment);
        res.status(201).send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to add comment" });
      }
    });

    // ২. GET ALL COMMENTS FOR AN IDEA (🌍 PUBLIC)
    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const ideaId = req.params.ideaId;
        const result = await commentsCollection
          .find({ ideaId: ideaId })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send([]);
      }
    });

    // ৩. DELETE COMMENT (🔒 PROTECTED)
    app.delete("/comments/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        // const result = await commentsCollection.deleteOne({
        //   _id: new ObjectId(id),
        // });

        const existingComment = await commentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingComment) {
          return res
            .status(404)
            .send({ success: false, message: "Comment not found" });
        }

        if (existingComment.userEmail !== req.user.email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await commentsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to delete comment" });
      }
    });

    // coment add
    app.patch("/comments/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { text } = req.body;

        const existingComment = await commentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingComment) {
          return res
            .status(404)
            .send({ success: false, message: "Comment not found" });
        }

        if (existingComment.userEmail !== req.user.email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {

commentText:text,
              // text,
              updatedAt: new Date(),
            },
          },
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to update comment",
        });
      }
    });

    // =========================================================================
    // 🔑 DASHBOARD & USER WORKSPACE API ROUTES (🔒 PROTECTED + MOST IMPORTANT SECURITY FIXES)
    // =========================================================================

    // ১. MY IDEAS LIST (🔒 PROTECTED + SECURITY FIX)
    app.get("/my-idea", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email query is required" });
        }

        // ✅ MY IDEAS SECURITY FIX
        if (req.user.email !== email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const query = { userEmail: email };
        const result = await ideasCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch user ideas" });
      }
    });

    // ২. UPDATE IDEA (🔒 PROTECTED + 🔴 DB EXISTING OWNER SECURITY FIX)
    app.patch("/idea/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const query = { _id: new ObjectId(id) };

        // ✅ UPDATE IDEA EXISTING DB OWNER CHECK
        const existingIdea = await ideasCollection.findOne(query);
        if (!existingIdea) {
          return res
            .status(404)
            .send({ success: false, message: "Idea not found" });
        }
        if (existingIdea.userEmail !== req.user.email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        delete updatedData._id;
        const updateDoc = {
          $set: updatedData,
        };
        const result = await ideasCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: "Update failed" });
      }
    });

    // ৩. DELETE IDEA (🔒 PROTECTED + 🔴 DB EXISTING OWNER SECURITY FIX)
    app.delete("/idea/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        // ✅ DELETE IDEA EXISTING DB OWNER CHECK
        const existingIdea = await ideasCollection.findOne(query);
        if (!existingIdea) {
          return res
            .status(404)
            .send({ success: false, message: "Idea not found" });
        }
        if (existingIdea.userEmail !== req.user.email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await ideasCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: "Deletion failed" });
      }
    });

    // ৪. MY INTERACTIONS (🔒 PROTECTED + SECURITY FIX)
    app.get("/my-interactions", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        // ✅ MY INTERACTIONS SECURITY FIX
        if (req.user.email !== email) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const userComments = await commentsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        const enhancedComments = await Promise.all(
          userComments.map(async (comment) => {
            let ideaTitle = "Unknown Idea Source";
            if (ObjectId.isValid(comment.ideaId)) {
              const idea = await ideasCollection.findOne({
                _id: new ObjectId(comment.ideaId),
              });
              if (idea) ideaTitle = idea.title;
            }
            return { ...comment, ideaTitle };
          }),
        );
        res.send(enhancedComments);
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to load interactions" });
      }
    });
  } finally {
    // Enforce pool safety
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("IdeaVault Server Architecture is fully sync'd!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
