var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var User = require("./models/user");
var methodOverride = require("method-override");
//setup
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
//connect to db
mongoose.connect('mongodb+srv://admin:admin@cluster0.vpous.mongodb.net/mathdoku_app?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));
//define schema
var puzzleSchema = new mongoose.Schema({
	number: Number,
	verticalWalls: Array,
	horizontalWalls: Array,
	answers: Array,
	operations: Array,
	size: String,
	difficulty: String
});
var Puzzle = mongoose.model("Puzzle", puzzleSchema);
//-auth setup
app.use(require("express-session")({
    secret: "express session secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    next();
});
//ROUTES
//lading/home route
app.get("/", function(req,res){
    Puzzle.find({}, function(err, puzzles){
		if(err){
			console.log("error: "+err);
			res.send("Something went terribly wrong (db error)");
		}else{
			res.render("home", {puzzles: puzzles});
		}
	});
});
//puzzle
app.get("/puzzles/:number", function(req,res){
	var puzzlenum = req.params.number;
	Puzzle.findOne({number: puzzlenum}, function(err, puzzle){
		if(err){
			res.redirect("/");
		}else{
			//console.log(puzzle.verticalWalls);
			res.render("puzzle", {puzzle: JSON.stringify(puzzle)});
		}
	});
});
//complete puzzle (update db)
app.get("/puzzles/:number/complete", function(req,res){
    var pnum = req.params.number;
    var pnumi = pnum-1;
    console.log(pnum+" "+pnumi);
    if(!req.isAuthenticated()){
        res.redirect("/login");
    }else{
        User.findOne({username: res.locals.currentUser.username}, function(err,uuser){ 
            var foundId = uuser._id;
            console.log(uuser.username);
            var foundCompleted = uuser.puzzlesCompleted;
            console.log(foundCompleted);
            foundCompleted = foundCompleted.substring(0,pnumi)+"1"+foundCompleted.substring(pnumi+1);
            console.log(foundCompleted);
            //update db
            User.findByIdAndUpdate(foundId, {puzzlesCompleted: foundCompleted}, function(err, updatedUser){
                if(err){
                    console.log(err);
                    res.redirect("/");
                }else{
                    console.log(updatedUser.puzzlesCompleted);
                    res.redirect("/");
                }
            });
        });
    }
});
//AUTH ROUTES
//login
app.get("/login", function(req,res){
    res.render("login");
});
app.post("/login", passport.authenticate("local", 
    {successRedirect: "/",failureRedirect: "/login"}), 
    function(req,res){
});
//logout
app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
});
//register
app.get("/register", function(req, res){
    res.render("register");
});
app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username, puzzlesCompleted: "00000000000000000"});
    //puzzlesCompleted: "00000000000000000"
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }else{
            passport.authenticate("local")(req,res,function(){
                console.log(user);
                res.redirect("/");
            });
        }
    });
});
//middleware
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}
app.listen(process.env.PORT, process.env.IP, function(){
	console.log("mathdoku server started");
});