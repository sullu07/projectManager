require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

//requests logger

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

//routes
//auth
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/members", require("./routes/members"));
app.use("/api/users", require("./routes/users"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/admin", require("./routes/admin"));


// db connection

mongoose.set("strictQuery", false);

// Define the database URL to connect to.P
const mongoDB = 'mongodb+srv://sulaimmulla:aDamTYFgsIaXxwqi@cluster0.bc2kido.mongodb.net/projectDB';

//  Wait for database to connect, logging an error if there is a problem;


main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
  console.log("Database connected");
}

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : { err };

  // render the error page
  res.status(err.status || 500);
  res.send({
    status: "status",
    message: "message",
    data: "data"
  });

});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

