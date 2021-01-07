const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/userModel'); 
// convention to use a capital letter when importing a model
const Blogpost = require('./models/blogpostModel');
const { lookupService } = require('dns');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const auth = require('././middlewares/auth');
const { update } = require('./models/userModel');

const app = express();
dotenv.config( { path: './.env' } );

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then( () => console.log("MongoDB is connected"));

const viewsPath = path.join(__dirname, '/views');
const publicDirectory = path.join(__dirname, '/public');

app.set('views', viewsPath);
app.set('view engine', 'hbs');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({extended: false}));
app.use(express.json({extended: false}));
app.use(cookieParser());

app.get('/', auth.isLoggedIn, async (req, res) => {
    

    if(req.userFound && req.userFound.admin){
        console.log("user is logged in")
        const usersDB = await User.find();
    
        res.render('index', {
            users: usersDB
        });
    } else {
        console.log("you are a guest")
        res.send("Welcome to the homepage")
    }

    
});

app.get('/register', (req, res) =>{
    res.render('register');
});

app.post('/register', async (req, res) =>{
    console.log(req.body);

    const hashedPassword = await bcrypt.hash(req.body.userPassword, 13)
    // when doing this for a PromiseRejectionEvent, do the password later as need to check for duplicate email first
    await User.create({
        name: req.body.userName,
        email: req.body.userEmail,
        password: hashedPassword
    }); 

    res.send("User Registered");
})

app.get("/profile", auth.isLoggedIn, async (req, res) => {
    try {
        if( req.userFound ) {
            // const userDB = await User.findById(req.params.userId);
            const userDB = req.userFound;
            console.log(userDB);
            res.render('profile', {
                user: userDB
            });
        } else {
            res.send("You are not logged in");
        }
    } catch(error) {
        res.send("User not found");
    }
});
// create 2 routes, 1 app.get prifile update, to display the form to uopdate the user,
// then one app.post, convert the one below, grab the data from the form before

app.get("/profile/update/", auth.isLoggedIn, async (req, res) =>{
    try {
    const userName = "Helen";
    const userEmail = "Helen@helen.com";
    const userPassword = "Helen123";
    
    // should be grabbed by using req.body.etc
    

    await User.findByIdAndUpdate(req.userFound._id, {
        
            name: userName,
            email: userEmail,
            password: userPassword
    })

        res.send("User has been updated");
        } catch(error) {
            res.send("Could not find the user");
        }
});

app.post("/delete/:id", async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.send("User was deleted");
})

app.get("/blogpost/:id", (req, res) => {
    res.render('newPost', {
       id: req.params.id
    });
})

app.post("/blogpost/:id", async (req, res) => {
    await Blogpost.create({
        title: req.body.postTitle,
        body: req.body.postBody,
        user: req.params.id
    }); 

    res.send("Blog has been posted");
})

app.get("/allPosts/:id", async (req, res) => {
    // const allPosts = await Blogpost.find();
    // console log(allPosts);
    // shows all posts from everyone
    
    const allPosts = await Blogpost.find({user: req.params.id}.populate('user', 'name')); 
    // will ony show blog posts from the user whose id is in the parametrs in the url, the populate part brings through more info from the user collection
    // can add more ('user', 'name email')


    res.render("userBlogPosts");
});

app.get('/login', (req, res) => {
    res.render("login")
});

app.post('/login', async (req, res) => {
    //add bycrypt compare of provided user & password
    try {
        const user = await User.findOne({ email: req.body.userEmail })
        const isMatch = await bcrypt.compare(req.body.userPassword, user.password)

        if (isMatch) {
            // create a token to sign to authenticate
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN,
            });

            console.log(token); 

            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly:true
            }
            res.cookie('jwt', token, cookieOptions);
            res.send("You are logged in")
        } else {
            const error = "login failed";
            res.send("details not recognised");
        }
    } catch (err) {
        const error = "login failed";
        res.render("login", {
            error: error
        });
    }
});

app.get("/logout", auth.logout, (req, res) => {
    res.send("you are logged out")
})

app.get('*', (req, res) => {
    // res.send("you are logged out")
    res.redirect("/")
})

app.listen(5000, () => {
    console.log("Server is running on port 5000")
})