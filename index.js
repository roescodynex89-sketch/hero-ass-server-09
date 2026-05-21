// const express = require("express");
// const app = express();
// const dotenv = require("dotenv");
// const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
// dotenv.config();
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const port = process.env.PORT || 5000;
// // const clientUrl=process.env.CLIENT_URL
// const uri = process.env.MONGO_DB_URI;
// const jwtSecret = process.env.JWT_SECRET;

// // try

// app.set("trust proxy", 1);

// // app.use(cors());
// app.use(cookieParser());
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true,
//   }),
// );

// app.use(express.json());

// // .env

// // Db client

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// //  middleware add

// const verifyToken = (req, res, next) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.status(401).send({
//       success: false,
//       message: "Unauthorized Access",
//     });
//   }

//   jwt.verify(token, jwtSecret, (err, decoded) => {
//     if (err) {
//       return res.status(403).send({
//         success: false,
//         message: "Invalid Token",
//       });
//     }

//     req.user = decoded;
//     next();
//   });
// };

// async function run() {
//   try {
//     // await client.connect();

//     const db = client.db("hero-server");
//     const ideasCollection = db.collection("ideas");
//     const commentsCollection = db.collection("comments");
//     console.log("Successfully connected to MongoDB Workspace!");

//     // token generator

//     app.post("/jwt", async (req, res) => {
//       const user = req.body;
//       const token = jwt.sign(user, jwtSecret, {
//         expiresIn: "7d",
//       });

//       res.cookie("token", token, {
//         httpOnly: true,
//         secure: true,
//         sameSite: "none",
//         // fix lax
//         partitioned: true,
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//       });

//       res.send({ token });
//     });

//     // logout function add

//     app.post("/logout", async (req, res) => {
//       try {
//         res
//           .clearCookie("token", {
//             httpOnly: true,
//             secure: true,
//             sameSite: "none",
//             // add kori ki hoi
//             partitioned: true,
//           })
//           .send({ success: true, message: "Logged out successfully" });
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Server error during logout" });
//       }
//     });

//     // 1. add-idea(private)
//     app.post("/ideas", verifyToken, async (req, res) => {
//       try {
//         const idea = req.body;

//         //  FIX
//         if (req.user.email !== idea.userEmail) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const result = await ideasCollection.insertOne(idea);
//         if (result.insertedId) {
//           return res.status(201).send(result);
//         } else {
//           return res.status(400).send({ success: false, message: "failed" });
//         }
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to insert idea" });
//       }
//     });

//     // 2..search api
//     app.get("/ideas", async (req, res) => {
//       try {
//         const { search, category, limit } = req.query;
//         let query = {};
//         if (search) {
//           query.title = { $regex: search, $options: "i" };
//         }
//         if (category && category !== "All") {
//           query.category = category;
//         }
//         let cursor = ideasCollection.find(query).sort({ createdAt: -1 });

//         if (limit) {
//           cursor = cursor.limit(parseInt(limit));
//         }
//         const result = await cursor.toArray();
//         res.send(result);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to fetch ideas" });
//       }
//     });

//     // single-idea
//     app.get("/ideas/:id", verifyToken, async (req, res) => {
//       try {
//         const id = req.params.id;
//         if (!ObjectId.isValid(id)) {
//           return res
//             .status(400)
//             .send({ success: false, message: "Invalid ID format" });
//         }
//         const query = { _id: new ObjectId(id) };
//         const result = await ideasCollection.findOne(query);
//         if (!result) {
//           return res
//             .status(404)
//             .send({ success: false, message: "Idea not found" });
//         }
//         res.send(result);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Server error fetching details" });
//       }
//     });

//     // 00comments crud
//     app.post("/comments", verifyToken, async (req, res) => {
//       try {
//         const comment = req.body;

//         if (req.user.email !== comment.userEmail) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const result = await commentsCollection.insertOne(comment);
//         res.status(201).send(result);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to add comment" });
//       }
//     });

//     //
//     app.get("/comments/:ideaId", async (req, res) => {
//       try {
//         const ideaId = req.params.ideaId;
//         const result = await commentsCollection
//           .find({ ideaId: ideaId })
//           .sort({ createdAt: -1 })
//           .toArray();
//         res.send(result);
//       } catch (error) {
//         res.status(500).send([]);
//       }
//     });

//     app.delete("/comments/:id", verifyToken, async (req, res) => {
//       try {
//         const id = req.params.id;
//         // const result = await commentsCollection.deleteOne({
//         //   _id: new ObjectId(id),
//         // });

//         const existingComment = await commentsCollection.findOne({
//           _id: new ObjectId(id),
//         });

//         if (!existingComment) {
//           return res
//             .status(404)
//             .send({ success: false, message: "Comment not found" });
//         }

//         if (existingComment.userEmail !== req.user.email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const result = await commentsCollection.deleteOne({
//           _id: new ObjectId(id),
//         });

//         res.send(result);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to delete comment" });
//       }
//     });

//     // coment add
//     app.patch("/comments/:id", verifyToken, async (req, res) => {
//       try {
//         const id = req.params.id;
//         const { text } = req.body;

//         const existingComment = await commentsCollection.findOne({
//           _id: new ObjectId(id),
//         });

//         if (!existingComment) {
//           return res
//             .status(404)
//             .send({ success: false, message: "Comment not found" });
//         }

//         if (existingComment.userEmail !== req.user.email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const result = await commentsCollection.updateOne(
//           { _id: new ObjectId(id) },
//           {
//             $set: {
//               commentText: text,
//               // text,
//               updatedAt: new Date(),
//             },
//           },
//         );

//         res.send(result);
//       } catch (error) {
//         res.status(500).send({
//           success: false,
//           message: "Failed to update comment",
//         });
//       }
//     });

//     //  MY IDEAS LIST
//     app.get("/my-idea", verifyToken, async (req, res) => {
//       try {
//         const email = req.query.email;
//         if (!email) {
//           return res
//             .status(400)
//             .send({ success: false, message: "Email query is required" });
//         }

//         if (req.user.email !== email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const query = { userEmail: email };
//         const result = await ideasCollection
//           .find(query)
//           .sort({ createdAt: -1 })
//           .toArray();
//         res.send(result);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to fetch user ideas" });
//       }
//     });

//     app.patch("/idea/:id", verifyToken, async (req, res) => {
//       try {
//         const id = req.params.id;
//         const updatedData = req.body;
//         const query = { _id: new ObjectId(id) };

//         const existingIdea = await ideasCollection.findOne(query);
//         if (!existingIdea) {
//           return res
//             .status(404)
//             .send({ success: false, message: "Idea not found" });
//         }
//         if (existingIdea.userEmail !== req.user.email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         delete updatedData._id;
//         const updateDoc = {
//           $set: updatedData,
//         };
//         const result = await ideasCollection.updateOne(query, updateDoc);
//         res.send(result);
//       } catch (error) {
//         res.status(500).send({ success: false, message: "Update failed" });
//       }
//     });

//     app.delete("/idea/:id", verifyToken, async (req, res) => {
//       try {
//         const id = req.params.id;
//         const query = { _id: new ObjectId(id) };

//         //  DELETE IDEA
//         const existingIdea = await ideasCollection.findOne(query);
//         if (!existingIdea) {
//           return res
//             .status(404)
//             .send({ success: false, message: "Idea not found" });
//         }
//         if (existingIdea.userEmail !== req.user.email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const result = await ideasCollection.deleteOne(query);
//         res.send(result);
//       } catch (error) {
//         res.status(500).send({ success: false, message: "Deletion failed" });
//       }
//     });

//     // ৪. MY INTERACTIONS-----
//     app.get("/my-interactions", verifyToken, async (req, res) => {
//       try {
//         const email = req.query.email;
//         if (!email) {
//           return res
//             .status(400)
//             .send({ success: false, message: "Email is required" });
//         }

//         // FIX
//         if (req.user.email !== email) {
//           return res
//             .status(403)
//             .send({ success: false, message: "Forbidden Access" });
//         }

//         const userComments = await commentsCollection
//           .find({ userEmail: email })
//           .sort({ createdAt: -1 })
//           .toArray();
//         const enhancedComments = await Promise.all(
//           userComments.map(async (comment) => {
//             let ideaTitle = "Unknown Idea Source";
//             if (ObjectId.isValid(comment.ideaId)) {
//               const idea = await ideasCollection.findOne({
//                 _id: new ObjectId(comment.ideaId),
//               });
//               if (idea) ideaTitle = idea.title;
//             }
//             return { ...comment, ideaTitle };
//           }),
//         );
//         res.send(enhancedComments);
//       } catch (error) {
//         res
//           .status(500)
//           .send({ success: false, message: "Failed to load interactions" });
//       }
//     });
//   } finally {
//     // Enforce pool safety
//   }
// }
// run().catch(console.dir);

// app.get("/", (req, res) => {
//   res.send("IdeaVault Server Architecture is fully sync'd!");
// });

// app.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });


















const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_DB_URI;
const jwtSecret = process.env.JWT_SECRET;

app.set("trust proxy", 1);

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

// Db client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 🔥 [FIXED MIDDLEWARE] এটি এখন কুকি এবং হেডার দুটির মাধ্যমেই টোকেন রিসিভ করবে।
// ফলে তোমার কোনো পুরনো পেজ ক্রাশ করবে না, আবার নতুন পেজও আটকে যাবে না।
const verifyToken = (req, res, next) => {
  // ১. প্রথমে কুকি চেক করবে (লগইন এবং পুরনো পেজগুলোর ব্যাকআপের জন্য)
  let token = req.cookies?.token;

  // ২. কুকি ব্লকড থাকলে Authorization Header থেকে টোকেন নিবে (ক্রস-ডোমেন প্রোডাকশন ফিক্স)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

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
    const db = client.db("hero-server");
    const ideasCollection = db.collection("ideas");
    const commentsCollection = db.collection("comments");
    console.log("Successfully connected to MongoDB Workspace!");

    // token generator
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, jwtSecret, {
        expiresIn: "7d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // টোকেন বডিতেও রিটার্ন করা হলো যেন ফ্রন্টএন্ড হেডার দিয়ে পাঠাতে পারে
      res.send({ token });
    });

    // logout function add
    app.post("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            partitioned: true,
          })
          .send({ success: true, message: "Logged out successfully" });
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Server error during logout" });
      }
    });

    // 1. add-idea(private)
    app.post("/ideas", verifyToken, async (req, res) => {
      try {
        const idea = req.body;

        // ইমেইল স্ট্রিংয়ের কোনো স্পেস বা আপারকেসজনিত ঝামেলা এড়াতে .toLowerCase() ব্যবহার নিশ্চিত করা হলো
        const userEmail = req.user?.email?.toLowerCase();
        const ideaEmail = idea?.userEmail?.toLowerCase();

        if (userEmail !== ideaEmail) {
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

    // 2..search api
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

    // single-idea
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

    // 00comments crud
    app.post("/comments", verifyToken, async (req, res) => {
      try {
        const comment = req.body;

        if (req.user.email?.toLowerCase() !== comment.userEmail?.toLowerCase()) {
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

    app.delete("/comments/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const existingComment = await commentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingComment) {
          return res
            .status(404)
            .send({ success: false, message: "Comment not found" });
        }

        if (existingComment.userEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
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

        if (existingComment.userEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden Access" });
        }

        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              commentText: text,
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

    // MY IDEAS LIST
    app.get("/my-idea", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email query is required" });
        }

        if (req.user.email?.toLowerCase() !== email?.toLowerCase()) {
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

    app.patch("/idea/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const query = { _id: new ObjectId(id) };

        const existingIdea = await ideasCollection.findOne(query);
        if (!existingIdea) {
          return res
            .status(404)
            .send({ success: false, message: "Idea not found" });
        }
        if (existingIdea.userEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
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

    app.delete("/idea/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const existingIdea = await ideasCollection.findOne(query);
        if (!existingIdea) {
          return res
            .status(404)
            .send({ success: false, message: "Idea not found" });
        }
        if (existingIdea.userEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
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

    // ৪. MY INTERACTIONS
    app.get("/my-interactions", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ success: false, message: "Email is required" });
        }

        if (req.user.email?.toLowerCase() !== email?.toLowerCase()) {
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
    // Pool safety
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("IdeaVault Server Architecture is fully sync'd!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});