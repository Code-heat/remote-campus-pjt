var express = require('express');
var router = express.Router();
var monk = require('monk');
var db = monk('localhost:27017/alertbox');
var users = db.get('users');
var problems = db.get('problems');
var Nexmo = require('nexmo');
var nodemailer = require('nodemailer');
var randomstring = require("randomstring");

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nhnbindu0603@gmail.com',
    pass: 'Bindu@0603'
  }
});


const nexmo = new Nexmo({
  apiKey: '8ea4f64f',
  apiSecret: 'bucvH3h9amLgXVGp'
},{debug : true});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});


/* GET signup page. */
router.get('/signup', function(req, res) {
  if(req.session && req.session.user){
    res.redirect('/alertbox')
  }else{
    res.render('signup');
  }
});

router.get('/forget', function(req, res) {
  if(req.session && req.session.user){
    res.redirect('/alertbox')
  }else{
    res.render('forget',{error:""});
  }
});


/* GET login page. */
router.get('/login', function(req, res) {
  if(req.session && req.session.user){
    res.redirect('/alertbox')
  }else{
    res.render('login',{error:""});
  }
});


/* GET alertbox page. */
router.get('/alertbox', function(req, res) {
  if(req.session && req.session.user){
    res.render('alert');
  }else{
    res.redirect('/')
  }
});

router.post('/signup',function(req,res){
  var details = {
    email:req.body.email,
    password:req.body.password,
    username:req.body.username,
    phone:req.body.phone,
    category:req.body.category,
    profession:req.body.profession
  }
  users.insert(details,function(err,docs){
    if(err){
      console.log(err)
    }else{
      res.redirect('/login')
    }
  })
})

router.get('/problems',function(req,res){
  if(req.session && req.session.user.category === "Employee"){
    problems.find({"field":req.session.user.profession},function(err,docs){
      console.log(docs)
      res.render('problems',{docs:docs})
    })
  }else{
    res.redirect('/alertbox')
  }
})


router.post('/login',function(req,res){
  users.findOne({username:req.body.username,password:req.body.password},function(err,docs){
    if(err || !docs){
      res.render('login', {error:"invalid username or password"})
    }else{
      req.session.user = docs
      if(docs.category === "Employee"){
        res.redirect('/problems')
      }else{
        res.redirect('/alertbox')
      }
    }
  })
})

router.get('/logout',function(req,res){
  req.session.reset()
  res.redirect('/')
})

router.post('/postalert',function(req,res){
  
  var date = new Date()
  var day = date.getDate()
  var month = date.getMonth()
  var year = date.getFullYear()

  var details = {
    location:req.body.location,
    problem:req.body.problem,
    field:req.body.field,
    date: day + "-" + month + "-" + year
  }

  problems.insert(details,function(err,docs){
    if(err){
      console.log(err)
    }else{
      users.findOne({"profession":docs.field},function(err,details){
        const from = 'Alert box';
        const to = "91" + details.phone;
        const text = " location: " + req.body.location + " problem: " + req.body.problem;
        
        nexmo.message.sendSms(from, to, text);
        res.redirect('/alertbox')
      })
    }
  })

})

router.post('/forget',function(req,res){
  users.findOne({"email":req.body.email},function(err,docs){
    if(err){
      console.log(err)
    }else if(!docs){
      res.render('forget',{error:"invalid email Address!!"})
    }else{

      let otp = randomstring.generate({
        length: 5,
        charset: 'numeric'
      });

      var mailOptions = {
        from: 'nhnbindu0603@gmail.com',
        to: req.body.email,
        subject: 'OTP for verification',
        text: 'your OTP is ' + otp 
      };
      
      users.update({'email':req.body.email},{$set:{otp:otp}},function(err,docs){
        if(err){
          console.log(err)
        }else if(docs){
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
              res.render('otp',{error:""})
            }
          });
        }
      })
    }
  })
})


router.post('/verify',function(req,res){
  users.findOne({"otp":req.body.otp},function(err,docs){
    if(err){
      console.log(err)
    }else if(!docs){
      res.render('otp',{error:"invalid otp"})
    }else{
        res.render('confirm',{email:docs.email,error:""}) 
    }
  })
})


router.post('/update',function(req,res){

  if(req.body.password === req.body.cpassword){
    users.update({"email":req.body.email},{$set:{"password":req.body.password}},function(err,docs){
      if(err){
        console.log(err)
      }else{
        res.redirect('/login')
      }
    })
  }else{
    res.render('comfirm',{email:req.body.email,error:"password and confirm password are not same"})
  }

})

module.exports = router;
