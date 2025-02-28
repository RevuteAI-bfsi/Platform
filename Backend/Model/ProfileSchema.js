const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  phone: {
    type: String
  },
  profileImage: {
    data: Buffer,
    contentType: String
  }
});

module.exports = mongoose.model('Profile', ProfileSchema);
