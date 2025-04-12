const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userID: String,
    phoneNumber: String,
    password: String,
    username: String,
    accountRole: String,
    DOB: [String],
    conversationsID: [String],
    groupsID: [String],
    contacts: [Object],
    avatar: String,
    gmail: String, // Thêm trường gmail
});

module.exports = mongoose.model('User', userSchema);