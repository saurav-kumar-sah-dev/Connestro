const User = require("../models/User");

exports.followUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!user.followers.includes(req.user.id)) {
      user.followers.push(req.user.id);
      currentUser.following.push(user._id);
    }

    await user.save();
    await currentUser.save();

    res.json({ msg: "Followed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    user.followers.pull(req.user.id);
    currentUser.following.pull(user._id);

    await user.save();
    await currentUser.save();

    res.json({ msg: "Unfollowed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").populate("followers following", "username");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
