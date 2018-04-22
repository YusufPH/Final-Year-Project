var express = require('express');
var router = express.Router();
var fs = require('fs');
var expressValidator = require('express-validator');
var passport = require('passport');
var sqlite = require('sqlite-sync');
var bcrypt = require('bcrypt');
const saltRounds = 10;
var path = require('path');
var plotly = require('plotly')("pholbyyu", "yTpnM59UA4XJSA638mFY");
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'osmo.do.not.reply@gmail.com',
        pass: 'YusufPH97'
    }
});

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
    var cmd = "INSERT INTO MeetingInfo (title, description, location, adminUsername, locked, password, length, status, startTime, startDate) VALUES ('"+ req.body.title +"', '"+ req.body.description +"', '"+ req.body.location +"', '"+ req.session.passport.user.user_id +"', '"+ req.body.locked +"', '"+ pass +"','"+ req.body.length +"','"+ 'Open' +"','"+ '0' +"','"+ '0' +"');";
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
                cmd = "INSERT INTO MeetingDates (meetingid, date, lowerboundLimit, upperboundLimit) VALUES ('"+ id +"', '"+ option.date +"', '"+ option.start_time +"', '"+ option.end_time +"');";
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
    sqlite.run("SELECT id FROM urls WHERE extension = '"+req.body.id+"';", function (result) {
        if (result.error) throw result.error;
        id = result[0].id;
        console.log(id);
        sqlite.run("SELECT title, description, location, adminUsername, locked, password, length, status, startDate, startTime FROM MeetingInfo WHERE id='"+id+"';", function (data) {
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
            response.length = data[0].length;
            response.status = data[0].status;
            response.start_date = data[0].startDate;
            response.start_time = data[0].startTime;
            if(data[0].adminUsername == req.session.passport.user.user_id){
                response.isAdmin = true;
            }
            else{
                response.isAdmin = false;
            }
            sqlite.run("SELECT * FROM MeetingDates WHERE meetingId='"+id+"';", function (output) {
                if (output.error) throw output.error;
                response.options = output;
                console.log(JSON.stringify(response));
                res.status(200).end(JSON.stringify(response));
            });
        });
    });
});

router.post('/getMeetingEntries', function (req, res, next) {
    var id;
    var response = {};
    sqlite.run("SELECT id FROM urls WHERE extension = '"+req.body.id+"';", function (result) {
        if (result.error) throw result.error;
        id = result[0].id;
        console.log(id);
        sqlite.run("SELECT * FROM MeetingParticipation WHERE meetingId='"+id+"';", function (output) {
            if (output.error) throw output.error;
            response.options = output;
            console.log(JSON.stringify(response));
            res.status(200).end(JSON.stringify(response));
        });
    });
});

router.post('/getMeetingEntriesGraphs', function (req, res, next) {
    var id;
    var response = {};
    var prefEnd = '';
    sqlite.run("SELECT id FROM urls WHERE extension = '"+req.body.id+"';", function (result) {
        if (result.error) throw result.error;
        id = result[0].id;
        console.log(id);
        var duration;
        sqlite.run("SELECT length FROM MeetingInfo WHERE id='"+id+"';", function (data) {
            if (data.error) throw data.error;
            duration = data[0].length;
            console.log(duration);
            sqlite.run("SELECT * FROM MeetingParticipation WHERE meetingId='"+id+"';", function (output) {
                if (output.error) throw output.error;
                response.duration = duration;
                response.options = output;
                console.log(JSON.stringify(response));
                res.status(200).end(JSON.stringify(response));
            });
        });
    });
});

router.post('/getUserInfo', function (req, res, next) {
    var response = {};
    sqlite.run("SELECT id, username, email, fullName FROM users WHERE id = '"+req.session.passport.user.user_id+"';", function (result) {
        if (result.error) throw result.error;
        response.options = result;
        console.log(JSON.stringify(response));
        res.status(200).end(JSON.stringify(response));
    });
});

router.post('/getUserHost', function (req, res, next) {
    var response = {};
    var id;
    sqlite.run("SELECT MeetingInfo.id AS id, title, extension FROM MeetingInfo INNER JOIN urls ON urls.id = MeetingInfo.id WHERE adminUsername = '"+req.session.passport.user.user_id+"';", function (result) {
        if (result.error) throw result.error;
        response.options = result;
        console.log(JSON.stringify(response));
        res.status(200).end(JSON.stringify(response));
    });
});

router.post('/getUserParticipation', function (req, res, next) {
    var response = {};
    var id;
    sqlite.run("SELECT MeetingParticipation.meetingID AS meetingID, date, preferred, extension FROM MeetingParticipation INNER JOIN urls ON urls.id = MeetingParticipation.meetingID WHERE userID = '"+req.session.passport.user.user_id+"';", function (result) {
        if (result.error) throw result.error;
        response.options = result;
        console.log(JSON.stringify(response));
        res.status(200).end(JSON.stringify(response));
    });
});

router.post('/getUserInvites', function (req, res, next) {
    var response = {};
    var username;
    sqlite.run("SELECT username FROM users WHERE id = '"+req.session.passport.user.user_id+"';", function (result) {
        if (result.error) throw result.error;
        username = result[0].username;
        sqlite.run("SELECT InviterUsername, MeetingID FROM MeetingInvite WHERE InviteeUsername = '"+username+"';", function (output) {
        if (output.error) throw output.error;
        response.options = output;
        console.log(JSON.stringify(response));
        res.status(200).end(JSON.stringify(response));
        });
    });
});

/* POST create meeting */
router.post('/addMeetingDates', function (req, res, next) {
    console.log("Updating meeting");
    console.log(JSON.stringify(req.body));
    var id;
    var cmd = "SELECT id FROM urls WHERE extension='"+req.body.id+"'";
    sqlite.run(cmd, function (result) {
        console.log(JSON.stringify(result));
        id = result[0].id;
    });
    console.log(id);
    req.body.options.forEach(function (option) {
        cmd = "INSERT INTO MeetingDates (meetingid, date, lowerboundLimit, upperboundLimit) VALUES ('"+ id +"', '"+ option.date +"', '"+ option.start_time +"', '"+ option.end_time +"');";
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

/* POST create meeting */
router.post('/addMeetingParticipant', function (req, res, next) {
    console.log("Updating meeting");
    console.log(JSON.stringify(req.body));
    var id;
    var username;
    var cmd = "SELECT id FROM urls WHERE extension='"+req.body.id+"'";
    sqlite.run(cmd, function (result) {
        console.log(JSON.stringify(result));
        id = result[0].id;
    });
    console.log(id);
    cmd = "SELECT fullName FROM users WHERE id='"+req.session.passport.user.user_id+"'";
    sqlite.run(cmd, function (result) {
        console.log(JSON.stringify(result));
        username = result[0].fullName;
    });
    req.body.options.forEach(function (option) {
        cmd = "INSERT INTO MeetingParticipation (meetingID, Name, userID, date, lowerbound, upperbound, preferred, comment) VALUES ('"+ id +"', '"+ username  +"', '"+ req.session.passport.user.user_id +"',  '"+ option.date +"', '"+ option.start_time +"', '"+ option.end_time +"', '"+ option.pref_start +"', '"+ option.comment +"');";
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

router.post('/sendMeetingInvite', function (req, res, next) {
    console.log("Sending Invite");
    console.log(JSON.stringify(req.body));
    var inviter = '';
    var cmd = "SELECT username FROM users WHERE id='"+ req.session.passport.user.user_id +"'";
    sqlite.run(cmd, function (result) {
        if (result.error) throw result.error;
        console.log(JSON.stringify(result));
        inviter = result[0].username;
    });
    console.log(inviter);
    cmd = "INSERT INTO MeetingInvite (InviterUsername, InviteeUsername, MeetingID) VALUES ('"+ inviter +"', '"+ req.body.invitee +"',  '"+ req.body.id +"');";
    console.log(cmd);
    sqlite.run(cmd, function (response) {
        console.log(JSON.stringify(response));
        if (response.error)
        {
            console.log("Error  :");
            console.log(JSON.stringify(response.error));
            res.status(400).end(response.error);
        } else {
            console.log(typeof response);
            res.status(200).end(JSON.stringify(response));
        }
    });
});

router.post('/closeMeeting', function (req, res, next) {
    console.log("Closing meeting");
    console.log(JSON.stringify(req.body));
    var id;
    var cmd = "SELECT id FROM urls WHERE extension='"+req.body.id+"'";
    sqlite.run(cmd, function (result) {
        console.log(JSON.stringify(result));
        id = result[0].id;
    });
    console.log(id);
    cmd = "UPDATE MeetingInfo SET status = 'Closed', startDate = '" + req.body.closeDate + "', startTime = '" + req.body.closeTime + "' WHERE id = '"+ id +"'";
    console.log(cmd);
    sqlite.run(cmd, function (response) {
        console.log(JSON.stringify(response));
        if (response.error)
        {
            console.log("Error  :");
            console.log(JSON.stringify(response.error));
            res.status(400).end(response.error);
        } else {
            console.log(typeof response);
            res.status(200).end(JSON.stringify(response));
        }
    });
});

/* GET Register page. */
router.get('/register', function (req, res, next) {
    res.render('register', {title: 'Registration'});
});

/* POST Register page. */
router.post('/register', function (req, res, next) {

    req.checkBody('full_name', 'Full Name field cannot be empty.').notEmpty();
    req.checkBody('username', 'Username field cannot be empty.').notEmpty();
    req.checkBody('username', 'Username must be between 4-15 characters long.').len(4, 15);
    req.checkBody('email', 'The email you entered is invalid, please try again.').isEmail();
    req.checkBody('email', 'Email address must be between 4-100 characters long, please try again.').len(4, 100);
    req.checkBody('emailConfirm', 'Email addresses do not match').equals(req.body.email);
    req.checkBody('password', 'Password must be between 8-100 characters long.').len(8, 100);
    req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");
    req.checkBody('passwordMatch', 'Password must be between 8-100 characters long.').len(8, 100);
    req.checkBody('passwordMatch', 'Passwords do not match, please try again.').equals(req.body.password);

    const errors = req.validationErrors();
    var mailOptions;

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
        const fName = req.body.full_name;
        mailOptions = {
            from: 'osmo.do.not.reply@gmail.com',
            to: email,
            subject: 'Thank you for Registering with OSMO',
            html: 'Hi ' + fName + '<br>Thank you for registering with OSMO <br>' +
            'Username: ' + username +
            '<br> Password: ' + password + '<br>We hope you enjoy using our services'
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        bcrypt.hash(password, saltRounds, function (err, hash) {
            sqlite.run("INSERT INTO users (username, fullName, email, password) VALUES ('"+username+"', '"+ fName +"', '"+ email +"' ,'"+hash+"')", function (results){
                if (results.error) throw results.error;
                sqlite.run("SELECT id as user_id FROM users WHERE username='"+username+"'", function (response) {
                    if (response.error) throw response.error;
                    const user_id = response[0];

                    req.login(user_id, function (err) {
                        res.redirect('/');
                    });
                });

                //res.render('register', {title: 'Registration Complete'});
            });
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
    sqlite.run("SELECT id FROM urls WHERE extension='"+req.params.id+"'", function (response) {
        if (response.error) throw response.error;
        if (JSON.stringify(response) == "[]")
        {
            res.status(404).end("Meeting not found");
        } else {
            res.status(200).render('meetingDetails', {title: 'Meeting Details'});
        }
    });
});

router.get('/meeting/*', authenticationMiddleware(), function (req,res) {
    console.log("Trying to load " + __dirname + '/../' + req.params[0]);
    var filename = __dirname + '/../' + req.params[0];
    if (!fs.existsSync(filename))
    {
        res.status(404).end('Not found');
    } else {
        res.status(200).sendFile(path.resolve(filename));
    }
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
        res.status(200).sendFile(path.resolve(filename));
    }
});

module.exports = router;
