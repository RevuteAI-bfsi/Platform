const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../Model/UserSchema");
const UserProgress = require("../Model/EducationSchema");
const Admin = require("../Model/AdminSchema");
const Profile = require("../Model/ProfileSchema")

router.get("/fetchUsers/:adminName/:userId", async (req, res) => {
  const { adminName } = req.params;

  try {
      // Check if the admin exists in the Admin model
      const adminExists = await Admin.findOne({ username: adminName });
      if (!adminExists) {
          return res.status(404).json({ message: "Admin not found" });
      }

      // Fetch users assigned to the given admin
      const users = await User.find({ adminName }, 'username email'); // Fetch required fields

      res.json(users);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching users." });
  }
});



router.get("/fetchUser/leaderboard", async (req, res) => {
  try {
    const leaderboard = await UserProgress.aggregate([
      {
        $addFields: {
          topicsCompleted: {
            $sum: {
              $map: {
                input: "$modules",
                as: "module",
                in: {
                  $sum: {
                    $map: {
                      input: "$$module.subItems",
                      as: "subItem",
                      in: {
                        $size: {
                          $filter: {
                            input: "$$subItem.topics",
                            as: "topic",
                            cond: { $eq: ["$$topic.completed", true] }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: { overallScore: -1, topicsCompleted: -1 }
      }
    ]);

    // Assign rank based on sorted order
    leaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/fetchUser/moduleReports/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(404).json({ message: "User not found" });
    }
    // Iterate through modules, subItems and topics to collect completed topics
    let completedTopics = [];
    userProgress.modules.forEach(module => {
      module.subItems.forEach(subItem => {
        subItem.topics.forEach(topic => {
          if (topic.completed) {
            completedTopics.push({
              topicName: topic.topicName,
              // Generate an ID based on module and topic info (adjust as needed)
              topicId: `${module.moduleId}-${subItem.subItemName}-${topic.topicName}`
            });
          }
        });
      });
    });
    res.json(completedTopics);
  } catch (error) {
    console.error("Error fetching module reports:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch user profile by userId
router.get('/profile/:adminName/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the profile associated with the given userId
    const profile = await Profile.findOne({ userId }).populate("userId");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Convert profile image data to base64
    let profileImageBase64 = null;
    if (profile.profileImage && profile.profileImage.data) {
      profileImageBase64 = `data:${profile.profileImage.contentType};base64,${profile.profileImage.data.toString("base64")}`;
    }

    res.json({
      phoneNumber: profile.phone,
      profileImage: profileImageBase64
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});




module.exports = router;