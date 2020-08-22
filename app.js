var createError = require('http-errors');
var express = require('express');
var path = require('path');
// var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var jwt = require('jsonwebtoken'); 

var courseRouter = require('./routes/course');
var studentRouter = require('./routes/student');
var authRouter = require('./routes/auth');
const db = require('./data/mysql/index');

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

db.connectDB().then( (result) => {
    console.log("Connected to Database!");
}).catch( (err) => {
    console.log("Error in connecting to DB");
});

app.use( '/api', authRouter);
app.use( '/api/course', courseRouter );
app.use( '/api/student', studentRouter );


module.exports = app;
