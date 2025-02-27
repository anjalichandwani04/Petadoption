//imports
const express=require("express")

const port=3000
const connectDB=require('./connect')
const loginRouter=require('./routes/loginRoutes')
const mainRouter=require('./routes/mainRoutes')
const {restrictToLoggedInUserOnly}=require("./middleware/auth")
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
require('dotenv').config()
require("./middleware/authgoogle.js")
const passport=require('passport')
const flash=require("express-flash")
const session = require('express-session');
const cors = require('cors')

const app=express()

app.use( //use cors to communicate with frontend
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
      "Access-Control-Allow-Origin"
    ],
    credentials: true,
  })
);
//set express app
app.use(session({
    secret: 'HappyTails', 
    resave: false,
    saveUninitialized: true,
}));
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.set("view engine","ejs")
app.use(express.json())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.urlencoded({extended:false}))

//set routes
app.use("/",loginRouter)
app.use("/happytails/user",restrictToLoggedInUserOnly,mainRouter)

//start server and connect to db
app.timeout=30000
const start = async ()=>{
    try {
        await connectDB(process.env.MONGO_URI)
        app.listen(port,console.log("listening"))
    } catch (error) {
        console.log(error)
    } 
}

//call server to start
start()

  