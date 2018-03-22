var express = require('express');
var router = express.Router();
var fs = require('fs');
var expressValidator = require('express-validator');
var passport = require('passport');
var sqlite = require('sqlite-sync');
var bcrypt = require('bcrypt');
const saltRounds = 10;


/*var datepicker = require('js-datepicker');
const picker = datepicker(selector, options);*/
sqlite.connect(__dirname + '/../db/meetings.db');
/* GET home page. */
router.get('/', function (req, res) {
    res.render('Homepage', {title: 'Homepage'});
});

/* GET dashboard page. */
router.get('/dashboard', authenticationMiddleware(), function (req,res) {
    res.render('dashboard', {title: 'Dashboard'});
});

/* GET login page. */
router.get('/login', function (req, res, next) {
    res.render('login', {title: 'Login'});
});

router.post('/login', passport.authenticate('local', {successRedirect: '/dashboard', failureRedirect:'/login'}));

/* GET logout page. */
router.get('/logout', function (req, res, next) {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});


/* POST meeting details */
router.post('/createMeeting', function (req, res, next) {
    if (!req.body.password)
    {
        var pass = "";
    } else
    {
        var pass = req.body.password;
    }
    var cmd = "INSERT INTO MeetingInfo (title, description, location, adminUsername, locked, password, numOfDates) VALUES ('"+ req.body.title +"', '"+ req.body.description +"', '"+ req.body.location +"', '"+ req.session.passport.user.user_id +"', '"+ req.body.locked +"', '"+ pass +"', 0);";
    console.log(cmd);
    sqlite.run(cmd, function (results) {
        console.log(JSON.stringify(results));
        if (results.error)
        {
            console.log("Error:");
            console.log(JSON.stringify(results.error));
            res.status(400).end(results.error);
        } else {
            var id = results;
            req.body.options.forEach(function (option) {
                cmd = "INSERT INTO MeetingDates (meetingid, date, lowerboundLimit, upperboundLimit, length) VALUES ('"+ id +"', '"+ option.date +"', '"+ option.start_time +"', '"+ option.end_time +"', '"+ option.length +"');";
                console.log(cmd);
                sqlite.run(cmd, function (response) {
                    console.log(JSON.stringify(response));
                    if (response.error)
                    {
                        console.log("Error:");
                        console.log(JSON.stringify(response.error));
                        res.status(400).end(response.error);
                    } else {
                        var url = parseInt(Math.random().toString().split('.')[1]).toString(26);
                        cmd = "INSERT INTO urls VALUES('"+id+"','"+url+"');";
                        sqlite.run(cmd, function (data) {
                            console.log(JSON.stringify(data));
                            if (data.error)
                            {
                                console.log("Error:");
                                console.log(JSON.stringify(data.error));
                                res.status(400).end(data.error);
                            } else {
                                res.status(200).end(url);
                            }
                        });
                    }
                });
            });
        }
    });
});

router.post('/getMeeting', function (req, res, next) {
    var id;
    var response = {};
    sqlite.run("SELECT id FROM urls WHERE meetingID = '"+req.body.id+"';", function (result) {
        if (result.error) throw result.error;
        id = result[0].id;
        console.log(id);
        sqlite.run("SELECT title, description, location, locked, password FROM MeetingInfo WHERE id='"+id+"';", function (data) {
            if (data.error) throw data.error;
            if (data[0].locked)
            {
                response.password = data[0].password;
            }
            else
            {
                response.password = null;
            }
            response.title = data[0].title;
            response.description = data[0].description;
            response.location = data[0].location;
            sqlite.run("SELECT * FROM MeetingDates WHERE meetingId='"+id+"';", function (output) {
                if (output.error) throw output.error;
                response.options = output;
                console.log(JSON.stringify(response));
                res.status(200).end(JSON.stringify(response));

            });
        });
    });
;})

router.post('/addMeetingDates', function (req, res, next) {
    console.log("Updating meeting");
    console.log(JSON.stringify(req.body));
    var id;
    var cmd = "SELECT id FROM urls WHERE meetingID='"+req.body.id+"'";
    sqlite.run(cmd, function (result) {
        console.log(JSON.stringify(result));
        id = result[0].id;
    });
    console.log(id);
    req.body.options.forEach(function (option) {
        cmd = "INSERT INTO MeetingDates (meetingid, date, lowerboundLimit, upperboundLimit, preferredStart, length) VALUES ('"+ id +"', '"+ option.date +"', '"+ option.start_time +"', '"+ option.end_time +"', '"+ option.pref_start +"', '"+ option.length +"');";
        console.log(cmd);
        sqlite.run(cmd, function (response) {
            console.log(JSON.stringify(response));
            if (response.error)
            {
                console.log("Error  :");
                console.log(JSON.stringify(response.error));
                res.status(400).end(response.error);
            } else {
                res.status(200).end(id);
            }
        });
    });
});

/* GET Register page. */
router.get('/register', function (req, res, next) {
    res.render('register', {title: 'Registration'});
});

/* POST Register page. */
router.post('/register', function (req, res, next) {

    req.checkBody('username', 'Username field cannot be empty.').notEmpty();
    req.checkBody('username', 'Username must be between 4-15 characters long.').len(4, 15);
    req.checkBody('email', 'The email you entered is invalid, please try again.').isEmail();
    req.checkBody('email', 'Email address must be between 4-100 characters long, please try again.').len(4, 100);
    req.checkBody('password', 'Password must be between 8-100 characters long.').len(8, 100);
    req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");
    req.checkBody('passwordMatch', 'Password must be between 8-100 characters long.').len(8, 100);
    req.checkBody('passwordMatch', 'Passwords do not match, please try again.').equals(req.body.password);

    const errors = req.validationErrors();

    if (errors) {
        console.log(`errors: ${JSON.stringify(errors)}`);

        res.render('register', {
            title: 'Registration Error',
            errors: errors
        });
    } else {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;



        bcrypt.hash(password, saltRounds, function (err, hash) {
            sqlite.run("INSERT INTO users (username, email, password) VALUES ('"+username+"', '"+ email +"', '"+hash+"')", function (results){
                if (results.error) throw results.error;
                sqlite.run("SELECT id as user_id FROM users WHERE username='"+username+"'", function (response) {
                    if (response.error) throw response.error;
                    const user_id = response[0];

                    req.login(user_id, function (err) {
                        res.redirect('/');
                    });
                });

                res.render('register', {title: 'Registration Complete'});
            })
        });
    }
});

passport.serializeUser(function (user_id, done) {
    done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
    done(null, user_id);
});

function authenticationMiddleware () {
    return (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/login')
    }
}

/* GET meetings page. */

router.get('/meeting/:id', authenticationMiddleware(), function (req,res) {
    sqlite.run("SELECT id FROM urls WHERE meetingID='"+req.params.id+"'", function (response) {
        if (response.error) throw response.error;
        if (JSON.stringify(response) == "[]")
        {
            res.status(404).end("Meeting not found");
        } else {
            res.status(200).render('meetingDetails', {title: 'Meeting Details'});
        }
    });
});

/* GET meetings page. */
router.get('/meeting', authenticationMiddleware(), function (req,res) {
    res.render('meeting', {title: 'Meeting '});

});

router.get('/*', function (req, res) {
    console.log("Trying to load " + __dirname + '/../' + req.params[0]);
    var filename = __dirname + '/../' + req.params[0];
    if (!fs.existsSync(filename))
    {
        res.status(404).end('Not found');
    } else {
        res.status(200).sendFile(filename);
    }
});

function getId(url) {

}

module.exports = router;
